<template>
  <div class="monitor-iframe-container">
    <div class="iframe-header">
      <h2 class="page-title">硬件监控</h2>
      <div class="control-actions">
        <el-button type="primary" @click="refreshIframe(false)" :loading="isRefreshing">
          <i class="ep:refresh"></i> 智能刷新
        </el-button>
        <el-button type="warning" @click="refreshIframe(true)" :loading="isRefreshing">
          <i class="ep:refresh-right"></i> 强制刷新
        </el-button>
        <el-button @click="openInNewWindow">
          <i class="ep:new-window"></i> 新窗口打开
        </el-button>
      </div>
    </div>

    <div class="iframe-wrapper">
      <iframe
        ref="monitorIframe"
        :src="iframeSrc"
        frameborder="0"
        width="100%"
        height="100%"
        @load="handleIframeLoad"
        @error="handleIframeError"
      ></iframe>
      
    <!-- 加载指示器 -->
      <div v-if="isLoading" class="iframe-loading">
      <div class="loading-spinner"></div>
        <div class="loading-text">正在加载硬件监控界面...</div>
    </div>
    
    <!-- 错误提示 -->
      <div v-if="hasError" class="iframe-error">
        <div class="error-icon">⚠️</div>
        <div class="error-title">加载失败</div>
        <div class="error-message">无法连接到监控服务，请检查服务状态</div>
        <div class="error-actions">
          <el-button type="primary" @click="retryLoad">重试</el-button>
          <el-button @click="checkService">检查服务</el-button>
    </div>
            </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onActivated, onDeactivated, watch, nextTick} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";
import { useRunningTasksStore } from "@/store/modules/runningTasks";
import { usePageStateStore } from "@/store/modules/pageState";

// 状态变量
const isLoading = ref(true);
const hasError = ref(false);
const isRefreshing = ref(false);
const monitorIframe = ref(null);
// 新增：iframe 就绪与队列
const iframeReady = ref(false);
const pendingMessages = ref([]); // { type, data, ... }
const loggedWarnTypes = new Set();

// 广播抑制标志，用于避免“iframe -> 容器 -> iframe”的回声环
const suppressBroadcast = ref(false)

// ✅ 页面状态管理store
const pageStateStore = usePageStateStore();


// 🎯 新增：iframe状态管理
const iframeInitialized = ref(false);
const lastLoadTime = ref(0);
const RELOAD_COOLDOWN = 30000; // 30秒内不重复加载


const childBase = (import.meta.env.VITE_CHILD_ORIGIN || window.location.origin).replace(/\/$/, '');
const iframeSrc = ref(`${childBase}/child/#/monitor-standalone?iframe=true`);
const childOrigin = new URL(iframeSrc.value).origin;

// ✅ 保存页面状态
const savePageState = () => {
  try {
    pageStateStore.updateMonitorIframeStatus(isLoading.value);
    pageStateStore.updateMonitorIframeInitialized(iframeInitialized.value);
    pageStateStore.updateMonitorAutoLoadStatus(!isLoading.value && !hasError.value);
    
    if (iframeSrc.value !== "http://localhost:8850/#/monitor-standalone?iframe=true") {
      pageStateStore.updateMonitorCurrentStructure(iframeSrc.value);
    }
    
    console.log('✅ Monitor页面状态已保存到store');
  } catch (error) {
    console.warn('❌ 保存Monitor页面状态失败:', error);
  }
};

// ✅ 恢复页面状态
const restorePageState = () => {
  try {
    const monitorState = pageStateStore.monitorPageState;
    
    // 恢复iframe状态
    if (monitorState.iframeInitialized && !iframeInitialized.value) {
      console.log('🔄 Monitor页面状态已从store恢复，跳过重复初始化');
      iframeInitialized.value = true;
      lastLoadTime.value = Date.now();
    }
    
    // 如果有保存的结构ID，尝试恢复
    if (monitorState.currentStructureId) {
      console.log('🔄 恢复当前结构ID:', monitorState.currentStructureId);
    }
    
    console.log('✅ Monitor页面状态已从store恢复');
  } catch (error) {
    console.warn('❌ 恢复Monitor页面状态失败:', error);
  }
};
// 安全发送：未就绪则入队，就绪则直接发送
const safePostToIframe = (msg) => {
  if (monitorIframe.value && monitorIframe.value.contentWindow && iframeReady.value) {
    try {
      monitorIframe.value.contentWindow.postMessage(msg, childOrigin);
    } catch (e) {
      console.error('❌ 向 iframe 发送消息失败（将入队重试）:', e);
      pendingMessages.value.push(msg);
    }
  } else {
    // 入队并避免重复刷屏
    pendingMessages.value.push(msg);
    if (msg && msg.type && !loggedWarnTypes.has(msg.type)) {
      console.log(`⚠️ iframe未准备好，已暂存 ${msg.type} 消息，待就绪后统一转发`);
      loggedWarnTypes.add(msg.type);
    }
  }
};

// 统一冲刷队列
const flushPendingMessages = () => {
  if (!(monitorIframe.value && monitorIframe.value.contentWindow && iframeReady.value)) return;
  const queue = [...pendingMessages.value];
  pendingMessages.value = [];
  loggedWarnTypes.clear();
  queue.forEach((m) => {
    try {
      monitorIframe.value.contentWindow.postMessage(m, childOrigin);
    } catch (e) {
      console.error('❌ 冲刷消息失败，将保留在队列中:', e, m);
      pendingMessages.value.push(m);
    }
  });
  if (queue.length > 0) {
    console.log(`✅ 已向 iframe 冲刷 ${queue.length} 条积压消息`);
  }
};
// 处理iframe加载完成
const handleIframeLoad = () => {
  console.log("✅ iframe加载完成");
  isLoading.value = false;
  hasError.value = false;
  
  // ✅ 同步状态到store
  pageStateStore.updateMonitorIframeStatus(true);
  
  // 🎯 检查是否需要初始化
  const now = Date.now();
  const shouldInitialize = !iframeInitialized.value || (now - lastLoadTime.value > RELOAD_COOLDOWN);
  
   if (!shouldInitialize) {
    console.log('📋 iframe已初始化且在冷却期内，跳过重复初始化');
    setupIframeCommunication();
    // 主动发送就绪检查
    safePostToIframe({ type: 'IFRAME_READY_CHECK', timestamp: new Date().toISOString() });
    return;
  }
  
  console.log('🎯 首次加载iframe或超过冷却期，进行初始化');
  lastLoadTime.value = now;
  
  // 🎯 等待iframe内容完全加载后再设置通信
  setTimeout(() => {
    setupIframeCommunication();
    
    // 主动发送就绪检查
    safePostToIframe({ type: 'IFRAME_READY_CHECK', timestamp: new Date().toISOString() });
    // 🎯 只在首次加载或明确需要时才自动加载结构
    if (!iframeInitialized.value) {
      setTimeout(() => {
        console.log('🎯 首次初始化：自动触发加载第一个可用的自定义结构');
        safePostToIframe({
          type: 'AUTO_LOAD_STRUCTURE',
          data: JSON.stringify({
            action: 'loadFirstAvailableStructure',
            reason: 'first_load',
            timestamp: new Date().toISOString()
          })
        });
        console.log('✅ 已发送首次自动加载结构消息到iframe');
        iframeInitialized.value = true;
      }, 1000);
    } else {
      console.log('📋 iframe已初始化，跳过自动加载结构');
      iframeInitialized.value = true;
    }
  }, 500); // 给iframe一些加载时间
};

// 处理iframe加载错误
const handleIframeError = () => {
  console.error("❌ iframe加载失败");
  isLoading.value = false;
  hasError.value = true;
  ElMessage.error("无法加载监控界面");
};

// 设置iframe通信
const setupIframeCommunication = () => {
  // 监听来自iframe的消息
  window.addEventListener('message', handleIframeMessage);
  
  // 🎯 监听Store中的工作流状态变化，并传递给iframe
  const runningTasksStore = useRunningTasksStore();
  
  // 发送完整store状态到iframe的辅助函数
  const sendStoreStateToIframe = () => {
    // 抑制中则跳过本次广播
    if (suppressBroadcast.value) {
      console.log('🔇 抑制中，跳过 WORKFLOW_UPDATE 广播');
      return;
    }

    if (monitorIframe.value && monitorIframe.value.contentWindow) {
      try {
        const runningTasksStore = useRunningTasksStore();
        
        // 深度序列化函数，移除不可序列化的属性
        const deepSerialize = (obj) => {
          if (obj === null || obj === undefined) return obj;
          if (typeof obj === 'function') return null;
          if (obj instanceof Date) return obj.toISOString();
          if (obj instanceof Map) {
            const result = {};
            obj.forEach((value, key) => {
              result[key] = deepSerialize(value);
            });
            return result;
          }
          if (obj instanceof Set) {
            return Array.from(obj).map(item => deepSerialize(item));
          }
          if (Array.isArray(obj)) {
            return obj.map(item => deepSerialize(item));
          }
          if (typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
              // 跳过函数和不可序列化的属性
              if (typeof value !== 'function' && key !== '__v_isRef' && key !== '__v_isReactive') {
                result[key] = deepSerialize(value);
              }
            }
            return result;
          }
          return obj;
        };
        
        // 安全地获取store数据
        const runningTasks = runningTasksStore?.runningTasks || [];
        const currentWorkflow = runningTasksStore?.getCurrentWorkflowInfo || null;
        const workflowStatus = runningTasksStore?.workflowStatus || 'idle';
        const expectedStates = runningTasksStore?.getExpectedStates || new Map();
        const actualStates = runningTasksStore?.getActualStates || new Map();

        // 构建 iframe 端期望的字段名（兼容 monitor-standalone 的 handleWorkflowUpdate）
        const workflowUpdatePayload = {
          workflow: deepSerialize(currentWorkflow),
          status: workflowStatus,
          expectedStates: deepSerialize(expectedStates),
          actualStates: deepSerialize(actualStates),
          timestamp: new Date().toISOString()
        };

        // 使用安全发送（注意这里改为发送 workflow/status 字段）
        safePostToIframe({ type: 'WORKFLOW_UPDATE', data: workflowUpdatePayload });
        console.log('🎯 已发送工作流状态到监控界面（workflow/status 字段，对齐子页面）');
      } catch (error) {
        console.error('发送store状态失败:', error);
        // 失败兜底（保持字段名一致）
        safePostToIframe({
          type: 'WORKFLOW_UPDATE',
          data: {
            workflow: null,
            status: 'idle',
            expectedStates: {},
            actualStates: {},
            timestamp: new Date().toISOString(),
            error: error.message
          }
        });
      }
    }
  };
  
  // 监听工作流状态变化
  watch(() => runningTasksStore.getCurrentWorkflowInfo, (newWorkflow) => {
    if (suppressBroadcast.value) return;
    sendStoreStateToIframe();
  }, { immediate: true, deep: true });

  // 监听运行任务变化
  watch(() => runningTasksStore.runningTasks, (newTasks) => {
    if (suppressBroadcast.value) return;

    if (monitorIframe.value && monitorIframe.value.contentWindow) {
      try {
        // 深度序列化任务数据
        const serializeTasks = (tasks) => {
          if (!Array.isArray(tasks)) return [];
          return tasks.map(task => {
            if (!task || typeof task !== 'object') return null;
            
            // 只保留可序列化的属性
            const serializedTask = {};
            for (const [key, value] of Object.entries(task)) {
              if (typeof value !== 'function' && 
                  key !== '__v_isRef' && 
                  key !== '__v_isReactive' &&
                  value !== undefined) {
                if (value instanceof Date) {
                  serializedTask[key] = value.toISOString();
                } else if (Array.isArray(value)) {
                  serializedTask[key] = value.filter(item => 
                    item !== null && item !== undefined && typeof item !== 'function'
                  );
                } else if (typeof value === 'object' && value !== null) {
                  // 简单对象的浅拷贝
                  serializedTask[key] = JSON.parse(JSON.stringify(value));
                } else {
                  serializedTask[key] = value;
                }
              }
            }
            return serializedTask;
          }).filter(task => task !== null);
        };
        
        const serializedTasks = serializeTasks(newTasks || []);
        
        safePostToIframe({ type: 'RUNNING_TASKS_UPDATE', data: serializedTasks });
        console.log('🎯 已发送运行任务更新（安全发送）:', serializedTasks.length, '个任务');
      } catch (error) {
        console.error('发送运行任务更新失败:', error);
        safePostToIframe({ type: 'RUNNING_TASKS_UPDATE', data: [] });
      }
    }
  }, { immediate: true, deep: true });

  // 监听工作流总体状态
  watch(() => runningTasksStore.workflowStatus, () => {
    if (suppressBroadcast.value) return;
    sendStoreStateToIframe();
  }, { immediate: true });

  // 监听期望设备状态
  watch(() => runningTasksStore.getExpectedStates, () => {
    if (suppressBroadcast.value) return;
    sendStoreStateToIframe();
  }, { immediate: true, deep: true });

  // 监听实际设备状态
  watch(() => runningTasksStore.getActualStates, () => {
    if (suppressBroadcast.value) return;
    sendStoreStateToIframe();
  }, { immediate: true, deep: true });
  
  // 🎯 消息监听已在setupGlobalMessageListening中统一处理
};

// 处理来自iframe的消息
const handleIframeMessage = async (event) => {
  // 验证来源
  if (event.origin !== childOrigin) {
    return;
  }
  
  try {
    const { type, data } = event.data;
    const runningTasksStore = useRunningTasksStore();

    switch (type) {
      case 'monitor-ready':
        console.log("✅ Monitor页面已准备就绪");
        iframeReady.value = true;
        // 一次性冲刷积压消息
        flushPendingMessages();
        // 保持原有逻辑
        setTimeout(() => { setupIframeCommunication(); }, 100);
        if (window.parent !== window) {
          try {
            window.parent.postMessage(
              { type: 'monitor-ready', timestamp: new Date().toISOString() },
              window.location.origin
            );
            console.log('✅ 已将 monitor-ready 转发给任务页面');
          } catch (err) {
            console.warn('⚠️ monitor-ready 转发失败：', err);
          }
        }
        break;
      
      case 'IFRAME_READY_RESPONSE':
        console.log("✅ 收到iframe准备状态响应");
        iframeReady.value = true;
        flushPendingMessages();
        // 转发到任务页面（保留原有逻辑）
        if (window.parent !== window) {
          window.parent.postMessage(event.data, window.location.origin);
        }
        break;
      
      case 'device-selected':
        console.log("设备已选择:", data);
        break;
        
      case 'task-updated':
        console.log("任务状态更新:", data);
        break;
        
      case 'DEVICE_STATE_UPDATE':
        // 处理来自iframe的设备状态更新（会写本地store）
        if (data && data.deviceId && data.actualState) {
          console.log("📡 收到设备状态更新:", data);
          // 开启抑制，避免 watchers 立即把相同数据回发给 iframe
          suppressBroadcast.value = true;
          try {
            if (runningTasksStore && typeof runningTasksStore.updateActualHardwareState === 'function') {
              runningTasksStore.updateActualHardwareState(data.deviceId, data.actualState);
            }
          } finally {
            await nextTick();
            suppressBroadcast.value = false;
          }
        }
        break;
        
      case 'IFRAME_READY_RESPONSE':
        // 🎯 转发iframe准备状态响应到任务页面
        console.log("✅ 收到iframe准备状态响应，转发给任务页面");
        if (window.parent !== window) {
          window.parent.postMessage(event.data, window.location.origin);
        }
        break;
        
      case 'GRAPH_NODES_RESPONSE':
        // 🎯 转发图形节点响应到任务页面
        console.log("📋 收到图形节点响应，转发给任务页面");
        if (window.parent !== window) {
          window.parent.postMessage(event.data, window.location.origin);
        }
        break;
        
      default:
        console.log("收到其他类型消息:", type, data);
        break;
    }
  } catch (error) {
    console.error("处理iframe消息失败:", error);
  }
};

// 🎯 优化：智能刷新iframe
const refreshIframe = (forceReload = false) => {
  isRefreshing.value = true;
  
  const now = Date.now();
  const timeSinceLastLoad = now - lastLoadTime.value;
  
  // 如果距离上次加载时间很短且不是强制刷新，尝试软刷新
  if (!forceReload && timeSinceLastLoad < RELOAD_COOLDOWN && iframeInitialized.value) {
    console.log('📋 执行软刷新：重新请求图形节点信息');
    
    // 软刷新：只请求图形数据更新，不重新加载iframe
    if (monitorIframe.value && monitorIframe.value.contentWindow) {
      try {
        monitorIframe.value.contentWindow.postMessage({
          type: 'REQUEST_GRAPH_NODES',
          timestamp: new Date().toISOString()
        }, childOrigin);
        console.log('✅ 已发送图形节点请求（软刷新）');
      } catch (error) {
        console.error('❌ 软刷新失败，执行硬刷新:', error);
        forceReload = true;
      }
    }
    
    if (!forceReload) {
      setTimeout(() => {
        isRefreshing.value = false;
      }, 500);
      return;
    }
  }
  
  // 硬刷新：重新加载iframe
  console.log('🔄 执行硬刷新：重新加载iframe');
  isLoading.value = true;
  hasError.value = false;
  iframeInitialized.value = false;
  
  // 新增：重置就绪与队列
  iframeReady.value = false;
  pendingMessages.value = [];
  loggedWarnTypes.clear();
  
  if (monitorIframe.value) {
    monitorIframe.value.src = monitorIframe.value.src;
  }
  
  setTimeout(() => {
    isRefreshing.value = false;
  }, 1000);
};

// 在新窗口打开
const openInNewWindow = () => {
  window.open(iframeSrc.value, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
};

// 重试加载
const retryLoad = () => {
  hasError.value = false;
  isLoading.value = true;
  refreshIframe(true); // 重试时使用强制刷新
};

// 检查服务状态
const checkService = async () => {
  try {
    ElMessage.info("正在检查服务状态...");
    
    // 检查Chem_new-main服务是否运行
    const response = await axios.get('http://localhost:8850/monitor-standalone', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      ElMessage.success("监控服务运行正常");
      retryLoad();
    }
  } catch (error) {
    console.error("服务检查失败:", error);
    
    ElMessageBox.alert(
      '监控服务似乎未启动。请确保：\n\n1. Chem_new-main项目正在运行 (端口8850)\n2. 后端服务正在运行 (端口3000)\n3. 网络连接正常',
      '服务检查',
      {
        confirmButtonText: '确定',
        type: 'warning'
      }
    );
  }
};

// 🎯 优化：提前设置全局消息监听，确保不错过任何消息
const setupGlobalMessageListening = () => {
  console.log('🔧 设置全局消息监听');
  
  // 监听来自任务页面的消息，并转发给iframe
  window.addEventListener('message', (event) => {
    // 只处理来自本域的消息，防止安全问题
    if (event.origin !== window.location.origin) {
      return;
    }
    
         // 🎯 统一处理所有需要转发到monitor-standalone的消息类型
     const messagesToForward = [
       'REALTIME_HIGHLIGHT',
       'AUTO_LOAD_TASK_GRAPH', 
       'ROW_DATA',
       'AUTO_LOAD_STRUCTURE',
       'SHOW_TASK_INFO',
       'IFRAME_READY_CHECK'
     ];
     
     // 🎯 处理来自iframe的响应消息，需要转发回任务页面
     const responsesToForward = [
       'IFRAME_READY_RESPONSE',
       'GRAPH_NODES_RESPONSE'
     ];
    
    if (messagesToForward.includes(event.data.type)) {
      const msg = event.data;
      // 使用安全发送：未就绪则入队
      safePostToIframe(msg);
      // 轻量定时尝试冲刷（不递归）
      setTimeout(flushPendingMessages, 500);
    }
  });
  
  // 监听来自iframe的消息
  window.addEventListener('message', handleIframeMessage);
};

// 生命周期
onMounted(() => {
  console.log("🚀 Monitor iframe容器初始化");
  
  // 🎯 立即设置全局消息监听
  setupGlobalMessageListening();
  
  // 检查服务是否可用
  setTimeout(() => {
    if (isLoading.value) {
      console.warn("iframe加载时间过长，可能存在问题");
    }
  }, 10000);
  
  // 🎯 调试：定期检查store状态
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const runningTasksStore = useRunningTasksStore();
      if (runningTasksStore) {
        console.log('🔍 主项目store状态检查:', {
          runningTasks: runningTasksStore.runningTasks ? runningTasksStore.runningTasks.length : 0,
          workflowStatus: runningTasksStore.workflowStatus,
          expectedStates: runningTasksStore.getExpectedStates ? runningTasksStore.getExpectedStates.size : 0,
          actualStates: runningTasksStore.getActualStates ? runningTasksStore.getActualStates.size : 0,
          hasCurrentWorkflow: !!runningTasksStore.getCurrentWorkflowInfo
        });
      }
    }, 10000); // 每10秒输出一次状态
  }
});

// ✅ 页面激活时恢复状态  
onActivated(() => {
  console.log('🔄 Monitor页面被激活，恢复页面状态');
  restorePageState();
});

// ✅ 页面失活时保存状态
onDeactivated(() => {
  console.log('💾 Monitor页面失活，保存页面状态');
  savePageState();
});

onBeforeUnmount(() => {
  // 保存状态到本地存储
  pageStateStore.saveStateToLocalStorage();
  
  // 移除消息监听器
  window.removeEventListener('message', handleIframeMessage);
  // 新增：清理队列与就绪
  pendingMessages.value = [];
  loggedWarnTypes.clear();
  iframeReady.value = false;
});
</script>

<style scoped>
.monitor-iframe-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.iframe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.page-title {
  margin: 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.control-actions {
  display: flex;
  gap: 12px;
}

.iframe-wrapper {
  position: relative;
  flex: 1;
  background: white;
  overflow: hidden;
}

.iframe-wrapper iframe {
  display: block;
  border: none;
  width: 100%;
  height: 100%;
}

/* 加载指示器 */
.iframe-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 20px;
  color: #606266;
  font-size: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 错误提示 */
.iframe-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.error-message {
  font-size: 16px;
  color: #606266;
  margin-bottom: 30px;
  text-align: center;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .iframe-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .page-title {
    font-size: 18px;
  }
  
  .control-actions {
    align-self: stretch;
    justify-content: flex-end;
  }
}
</style>
