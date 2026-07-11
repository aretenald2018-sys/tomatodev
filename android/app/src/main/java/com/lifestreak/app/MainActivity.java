package com.lifestreak.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.lifestreak.app.wear.TomatoWearAppUpdatePlugin;
import com.lifestreak.app.wear.TomatoWearWorkoutBridge;
import com.lifestreak.app.running.TomatoRunningLocationPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(TomatoWearAppUpdatePlugin.class);
        registerPlugin(TomatoRunningLocationPlugin.class);
        super.onCreate(savedInstanceState);
        TomatoWearWorkoutBridge.registerActivity(this);
        handleWidgetIntent(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        TomatoWearWorkoutBridge.drainPendingToWebView(this, 300);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleWidgetIntent(intent);
        TomatoWearWorkoutBridge.drainPendingToWebView(this, 300);
    }

    @Override
    public void onDestroy() {
        TomatoWearWorkoutBridge.unregisterActivity(this);
        super.onDestroy();
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent == null) return;
        String addDate = intent.getStringExtra("addEventDate");
        String tab = intent.getStringExtra("tab");
        if (addDate != null && !addDate.isEmpty()) {
            // 앱 로드 후 캘린더 탭으로 전환 + 일정 등록 모달 오픈
            getBridge().getWebView().postDelayed(() -> {
                getBridge().getWebView().evaluateJavascript(
                    "if(window.switchTab){switchTab('calendar');setTimeout(()=>openCalEventModal('" + addDate + "'),300);}",
                    null
                );
            }, 800);
            // 중복 실행 방지
            intent.removeExtra("addEventDate");
        } else if (tab != null && !tab.isEmpty()) {
            getBridge().getWebView().postDelayed(() -> {
                getBridge().getWebView().evaluateJavascript(
                    "if(window.switchTab){switchTab('" + tab + "');}",
                    null
                );
            }, 800);
            intent.removeExtra("tab");
        }
    }
}
