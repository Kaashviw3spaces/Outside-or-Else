#include <jni.h>
#include <llama.h>
#include <nlohmann/json.hpp>
#include <atomic>
#include <chrono>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>
#include <algorithm>
#include <thread>
#include <android/log.h>

using json=nlohmann::ordered_json;
static llama_model *model=nullptr;
static llama_context *context=nullptr;
static std::atomic<bool> cancelled{false};
static std::chrono::steady_clock::time_point deadline;
static bool abort_decode(void *){return cancelled.load() || std::chrono::steady_clock::now() >= deadline;}
static void check_abort(){
    if(cancelled)throw std::runtime_error("Conversation cancelled.");
    if(std::chrono::steady_clock::now()>=deadline)throw std::runtime_error("Companion brain timed out. Close other apps and retry a shorter message.");
}
static void unload(){if(context)llama_free(context);context=nullptr;if(model)llama_model_free(model);model=nullptr;}
// JNI uses modified UTF-8; JSON is encoded with ASCII escapes across the boundary.
static std::string ascii(JNIEnv *env,jstring value){const char *p=env->GetStringUTFChars(value,nullptr);std::string s(p);env->ReleaseStringUTFChars(value,p);return s;}
static void fail(JNIEnv *env,const std::exception &e){env->ThrowNew(env->FindClass("java/lang/IllegalStateException"),e.what());}
extern "C" JNIEXPORT void JNICALL Java_com_outsideorelse_game_PetInferencePlugin_nativeCancel(JNIEnv *,jclass){cancelled=true;}
extern "C" JNIEXPORT void JNICALL Java_com_outsideorelse_game_PetInferencePlugin_nativePrepare(JNIEnv *,jclass){cancelled=false;deadline=std::chrono::steady_clock::now()+std::chrono::seconds(120);}
extern "C" JNIEXPORT void JNICALL Java_com_outsideorelse_game_PetInferencePlugin_nativeUnload(JNIEnv *,jclass){unload();}
extern "C" JNIEXPORT void JNICALL Java_com_outsideorelse_game_PetInferencePlugin_nativeLoad(JNIEnv *env,jclass,jstring path){
    try{
        if(model&&context)return;
        unload();llama_backend_init();
        auto mp=llama_model_default_params();mp.n_gpu_layers=0;mp.load_mode=LLAMA_LOAD_MODE_MMAP;
        mp.progress_callback=[](float,void*){return !abort_decode(nullptr);};
        model=llama_model_load_from_file(ascii(env,path).c_str(),mp);if(!model)throw std::runtime_error("Could not load bundled companion brain.");
        const char *tmpl=llama_model_chat_template(model,nullptr);
        if(!tmpl||std::string(tmpl).find("enable_thinking")==std::string::npos)throw std::runtime_error("Bundled companion chat template is unsupported.");
        auto cp=llama_context_default_params();cp.n_ctx=2048;cp.n_batch=128;cp.n_ubatch=128;
        cp.n_threads=std::max(1u,std::min(4u,std::thread::hardware_concurrency()));cp.n_threads_batch=cp.n_threads;
        cp.type_k=GGML_TYPE_F16;cp.type_v=GGML_TYPE_F16;cp.abort_callback=abort_decode;
        context=llama_init_from_model(model,cp);if(!context)throw std::runtime_error("Not enough memory to wake companion brain. Close other apps and retry.");
        if(cancelled)throw std::runtime_error("Cancelled waking companion brain.");
    }catch(const std::exception &e){unload();fail(env,e);}
}
static std::string prompt(const json &messages){
    // Exact Qwen3 non-thinking template for the pinned artifact: roles are validated,
    // embedded delimiters in untrusted text are neutralized. No generic chat fallback.
    std::string result;
    for(size_t i=0;i<messages.size();i++){
        const std::string role=messages[i].at("role"),content=messages[i].at("content");
        if(role!=(i==0?"system":i%2?"user":"assistant")||content.size()>24000)throw std::runtime_error("Invalid conversation roles or size.");
        std::string clean=content;
        for(const std::string marker:{"<|im_start|>","<|im_end|>","<|endoftext|>"}){size_t p=0;while((p=clean.find(marker,p))!=std::string::npos){clean.replace(p,marker.size(),"[chat marker]");p+=13;}}
        result+="<|im_start|>"+role+"\n"+clean+"<|im_end|>\n";
    }
    return result+"<|im_start|>assistant\n<think>\n\n</think>\n\n";
}
static std::vector<llama_token> tokenize(const std::string &text){
    auto vocab=llama_model_get_vocab(model);int n=llama_tokenize(vocab,text.data(),text.size(),nullptr,0,false,true);
    if(n>=0)throw std::runtime_error("Tokenizer did not report a prompt size.");
    std::vector<llama_token> tokens(-n);n=llama_tokenize(vocab,text.data(),text.size(),tokens.data(),tokens.size(),false,true);
    if(n<0)throw std::runtime_error("Tokenization failed.");tokens.resize(n);return tokens;
}
extern "C" JNIEXPORT jstring JNICALL Java_com_outsideorelse_game_PetInferencePlugin_nativeGenerate(JNIEnv *env,jclass,jstring input,jint limit){
    try{
        if(!model||!context)throw std::runtime_error("Wake companion brain first.");
        check_abort();auto messages=json::parse(ascii(env,input));
        if(!messages.is_array()||(messages.size()!=2&&messages.size()!=4&&messages.size()!=6))throw std::runtime_error("Conversation history exceeds limits.");
        auto tokens=tokenize(prompt(messages));
        while(tokens.size()>1024&&messages.size()>2){messages.erase(messages.begin()+1,messages.begin()+3);tokens=tokenize(prompt(messages));}
        if(tokens.size()>1024)throw std::runtime_error("This conversation is too long. Try a shorter message.");
        llama_memory_clear(llama_get_memory(context),true);
        const auto start=std::chrono::steady_clock::now();double first=-1;const int input_tokens=tokens.size();
        __android_log_print(ANDROID_LOG_INFO,"NativeAI","Prefill start: inputTokens=%d",input_tokens);
        for(size_t offset=0;offset<tokens.size();offset+=128){
            check_abort();
            auto batch=llama_batch_get_one(tokens.data()+offset,std::min<size_t>(128,tokens.size()-offset));
            int code=llama_decode(context,batch);
            if(code!=0){check_abort();throw std::runtime_error("Companion brain prefill failed (decode code "+std::to_string(code)+"). Close other apps and retry.");}
            __android_log_print(ANDROID_LOG_INFO,"NativeAI","Prefill progress: tokens=%zu/%zu",std::min<size_t>(offset+128,tokens.size()),tokens.size());
        }
        auto sampler=std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)>(llama_sampler_chain_init(llama_sampler_chain_default_params()),llama_sampler_free);
        llama_sampler_chain_add(sampler.get(),llama_sampler_init_top_k(20));llama_sampler_chain_add(sampler.get(),llama_sampler_init_top_p(0.8f,1));llama_sampler_chain_add(sampler.get(),llama_sampler_init_temp(0.7f));llama_sampler_chain_add(sampler.get(),llama_sampler_init_dist(LLAMA_DEFAULT_SEED));
        std::string output;int count=0;
        for(int i=0;i<std::clamp<int>(limit,1,72);i++){
            check_abort();
            auto token=llama_sampler_sample(sampler.get(),context,-1);if(llama_vocab_is_eog(llama_model_get_vocab(model),token))break;
            char piece[256];int n=llama_token_to_piece(llama_model_get_vocab(model),token,piece,sizeof(piece),0,false);
            if(n<0){std::vector<char> big(-n);n=llama_token_to_piece(llama_model_get_vocab(model),token,big.data(),big.size(),0,false);if(n>0)output.append(big.data(),n);}else output.append(piece,n);
            count++;if(first<0)first=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
            auto batch=llama_batch_get_one(&token,1);int code=llama_decode(context,batch);if(code!=0){check_abort();throw std::runtime_error("Companion brain generation failed (decode code "+std::to_string(code)+"). Please retry.");}
        }
        llama_memory_clear(llama_get_memory(context),true);
        double elapsed=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
        __android_log_print(ANDROID_LOG_INFO,"NativeAI","Generation complete: tokens=%d elapsedMs=%.0f",count,elapsed);
        json result={{"text",output},{"tokens",count},{"inputTokens",input_tokens},{"generationMs",elapsed},{"firstTokenMs",first<0?json(nullptr):json(first)}};
        auto encoded=result.dump(-1,' ',true,json::error_handler_t::replace);return env->NewStringUTF(encoded.c_str());
    }catch(const std::exception &e){if(context)llama_memory_clear(llama_get_memory(context),true);fail(env,e);return nullptr;}
}
