package com.outsideorelse.game;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PetInferencePlugin.class);
        registerPlugin(PetRemindersPlugin.class);
        registerPlugin(PetLocationPlugin.class);
        registerPlugin(PetCameraPlugin.class);
        registerPlugin(PetClockPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
