package com.outsideorelse.game;
import static org.junit.Assert.*;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import android.content.Context;
import android.content.pm.PackageManager;
import android.util.Log;
import java.io.*;
import java.lang.reflect.Method;
import org.json.*;
public class OfflineInferenceTest {
    private static Object invoke(String name,Class<?>[] types,Object... args)throws Exception{Method m=PetInferencePlugin.class.getDeclaredMethod(name,types);m.setAccessible(true);return m.invoke(null,args);}
    @Test public void actualBundledTokenGenerationWithoutInternetPermission()throws Exception{
        Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Use the isolated offlineVerify build",c.getPackageName().endsWith(".offlineverify"));
        assertEquals(PackageManager.PERMISSION_DENIED,c.checkSelfPermission("android.permission.INTERNET"));
        File model=new File(c.getFilesDir(),"offline-test.gguf");try(InputStream in=c.getAssets().open("Qwen_Qwen3-0.6B-Q4_K_M.gguf");FileOutputStream out=new FileOutputStream(model)){byte[] b=new byte[1048576];int n;while((n=in.read(b))!=-1)out.write(b,0,n);}
        System.loadLibrary("pet_inference");
        try{
            invoke("nativePrepare",new Class[]{});
            invoke("nativeLoad",new Class[]{String.class},model.getAbsolutePath());
            String nonce="Maple-"+System.nanoTime();JSONArray messages=new JSONArray().put(new JSONObject().put("role","system").put("content","You are a playful cat. Give one short friendly sentence about the imaginary object. No tools or actions.")).put(new JSONObject().put("role","user").put("content","My imaginary scarf is named "+nonce+". Welcome it."));
            invoke("nativePrepare",new Class[]{});
            JSONObject result=new JSONObject((String)invoke("nativeGenerate",new Class[]{String.class,int.class},messages.toString(),72));
            assertTrue(result.getInt("tokens")>0);assertTrue(result.getInt("inputTokens")>0);assertFalse(result.getString("text").trim().isEmpty());
            Log.i("OfflineInferenceEvidence",result.toString());
        }finally{invoke("nativeUnload",new Class[]{});model.delete();}
    }
}
