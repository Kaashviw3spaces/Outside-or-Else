package com.outsideorelse.game;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.security.MessageDigest;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import org.json.*;
import android.util.Log;

@CapacitorPlugin(name="PetInference")
public class PetInferencePlugin extends Plugin {
    private static final ExecutorService executor=Executors.newSingleThreadExecutor();
    private static final String MODEL="Qwen_Qwen3-0.6B-Q4_K_M.gguf";
    private static final String HASH="9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14";
    private static volatile boolean libraryLoaded=false;
    private static final AtomicLong epoch=new AtomicLong();
    private static native void nativeLoad(String path);
    private static native String nativeGenerate(String messages,int maxTokens);
    private static native void nativeCancel();
    private static native void nativePrepare();
    private static native void nativeUnload();
    private void run(PluginCall call, Callable<JSObject> operation) {
        long ticket=epoch.get();
        executor.execute(()->{try{if(ticket!=epoch.get())throw new Exception("Conversation cancelled");JSObject result=operation.call();if(ticket!=epoch.get())throw new Exception("Conversation cancelled");call.resolve(result);}catch(Throwable e){Log.e("NativeAI","Operation failed: "+e.getClass().getSimpleName());if(libraryLoaded)nativeUnload();call.reject(e.getMessage()==null?"Companion brain could not start":e.getMessage());}});
    }
    private boolean verified(File file) throws Exception {
        if(file.length()!=484220320L)return false;
        MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] buffer=new byte[1024*1024];
        try(InputStream in=new FileInputStream(file)){int n;while((n=in.read(buffer))!=-1)digest.update(buffer,0,n);}
        StringBuilder hash=new StringBuilder();for(byte b:digest.digest())hash.append(String.format("%02x",b&255));return HASH.equals(hash.toString());
    }
    @PluginMethod public void initialize(PluginCall call) {long ticket=epoch.get();run(call,()->{
        long start=System.nanoTime();Log.i("NativeAI","Loading bundled model");if(!libraryLoaded){System.loadLibrary("pet_inference");libraryLoaded=true;}
        File model=new File(getContext().getFilesDir(),MODEL);
        if(!verified(model)){
            File temp=new File(getContext().getFilesDir(),MODEL+".tmp");
            try(InputStream in=getContext().getAssets().open(MODEL);FileOutputStream out=new FileOutputStream(temp)){
                byte[] buffer=new byte[1024*1024];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);out.getFD().sync();
            }
            if(!verified(temp)){temp.delete();throw new IOException("Bundled companion brain is damaged. Reinstall the complete app without clearing your saves.");}
            if(!temp.renameTo(model))throw new IOException("Could not store companion brain. Free some phone storage and retry.");
        }
        nativePrepare();if(ticket!=epoch.get())throw new Exception("Cancelled waking companion brain");
        nativeLoad(model.getAbsolutePath());Log.i("NativeAI","Bundled model ready");JSObject result=new JSObject();result.put("loadMs",(System.nanoTime()-start)/1e6);return result;
    });}
    @PluginMethod public void generate(PluginCall call) {long ticket=epoch.get();run(call,()->{
        JSArray messages=call.getArray("messages");if(messages==null)throw new IllegalArgumentException("Missing conversation");
        StringBuilder encoded=new StringBuilder();for(char ch:messages.toString().toCharArray()){if(ch>=128)encoded.append(String.format("\\u%04x",(int)ch));else encoded.append(ch);}
        nativePrepare();if(ticket!=epoch.get())throw new Exception("Conversation cancelled");
        return new JSObject(nativeGenerate(encoded.toString(),Math.min(72,Math.max(1,call.getInt("maxTokens",72)))));
    });}
    @PluginMethod public void cancel(PluginCall call) {epoch.incrementAndGet();if(libraryLoaded)nativeCancel();call.resolve();}
    @PluginMethod public void unload(PluginCall call) {epoch.incrementAndGet();if(libraryLoaded)nativeCancel();run(call,()->{if(libraryLoaded)nativeUnload();return new JSObject();});}
    @Override protected void handleOnDestroy(){epoch.incrementAndGet();if(libraryLoaded)nativeCancel();executor.execute(()->{if(libraryLoaded)nativeUnload();});}
}
