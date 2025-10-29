// 文件：sharedConnectionManager.js（类 SharedConnectionManager 内新增桥接支持）
import { ref, reactive } from 'vue';

class SharedConnectionManager {
  constructor() {
    // 单例模式
    if (SharedConnectionManager.instance) {
      return SharedConnectionManager.instance;
    }
    SharedConnectionManager.instance = this;
    
    // 连接状态
    this.ws = null;
    this.isConnected = ref(false);
    this.isReconnecting = ref(false);
    this.connectionQuality = ref('unknown');
    
    // 重连配置
    this.reconnectConfig = {
      maxRetries: 10,
      retryCount: 0,
      retryInterval: 3000,
      backoffFactor: 1.5,
      maxInterval: 30000
    };
    
    // 消息缓存
    this.messageQueue = [];
    this.maxQueueSize = 100;
    
    // 事件监听器
    this.eventListeners = new Map();
    
    // 硬件状态
    this.hardwareStatus = reactive({
      connected: false,
      ip: null,
      lastConnectedTime: null,
      totalDisconnects: 0
    });
    
    this.transport = 'ws';
    this.bridgeClient = null;
    this.init();
  }
  
  /**
   * 初始化连接管理器
   */
  init(options = {}) {
    // 优先尝试 iframe 桥接
    this.tryInitBridge().then((ok) => {
      if (ok) {
        // 桥接成功，不再直连 WS
        return;
      }
      // 优先读取环境变量（生产环境可直接配置为 wss://your-domain/chem-api/devices/realtime）
      const configured = import.meta?.env?.VITE_WS_URL;
      const baseUrl = configured || (
        process.env.NODE_ENV === 'development'
          ? 'ws://localhost:3000'
          : window.location.origin.replace(/^http/, 'ws')
      );
      const token = options.token || (typeof window !== 'undefined' && localStorage.getItem('token')) || ''
      const qs = token ? `?token=${encodeURIComponent(token)}` : ''
      // 优先使用环境变量，其次同源推导，避免硬编码 localhost
      const wsBase =
        (import.meta?.env?.VITE_WS_URL && import.meta.env.VITE_WS_URL.replace(/^http/, 'ws')) ||
        (typeof window !== 'undefined' ? window.location.origin.replace(/^http/, 'ws') : 'ws://localhost')
      this.wsUrl = `${wsBase.replace(/\/$/, '')}/chem-api/devices/realtime${qs}`
      this.connect();
    });
  }
  
  /**
   * 🔌 建立WebSocket连接
   */
  connect() {
    if (this.transport === 'bridge') {
      return;
    }
    if (this.isReconnecting.value) {
      console.log('⚠️ 已在重连中，跳过重复连接');
      return;
    }
    
    console.log(`🔌 尝试连接WebSocket (${this.reconnectConfig.retryCount}/${this.reconnectConfig.maxRetries})`);
    
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = (event) => {
        console.log('🎉 WebSocket连接已建立');
        this.isConnected.value = true;
        this.connectionQuality.value = 'good';
        this.hardwareStatus.lastConnectedTime = new Date();
        
        // 重置重连配置
        this.reconnectConfig.retryCount = 0;
        this.isReconnecting.value = false;
        
        // 处理缓存的消息
        this.processCachedMessages();
        
        // 触发连接成功事件
        this.emit('connected', event);
        
        // 请求硬件状态
        setTimeout(() => {
          this.send({ type: 'getHardwareStatus' });
          this.send({ type: 'getDevices' });
        }, 500);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
          this.emit('message', data);
        } catch (error) {
          console.error('WebSocket消息解析错误:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket连接已关闭 (code: ${event.code})`);
        this.isConnected.value = false;
        this.hardwareStatus.totalDisconnects++;
        
        this.analyzeConnectionQuality();
        this.emit('disconnected', event);
        
        // 启动重连
        this.startReconnectProcess();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket错误:', error);
        this.isConnected.value = false;
        this.connectionQuality.value = 'poor';
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('❌ 创建WebSocket失败:', error);
      this.startReconnectProcess();
    }
  }
  // 新增：安全获取 Token（可按你项目的实际存储位置调整）
  getAuthTokenSafely() {
    try {
      // 优先从本地你的鉴权模块或 Pinia/Vuex 获取
      // 兜底从 localStorage 读取
      return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
    } catch {
      return '';
    }
  }

  // 子应用向父应用发消息时，优先使用同源（同域部署场景下更安全）
  sendToParent(payload) {
    try {
      window.parent?.postMessage(payload, window.location.origin)
    } catch (e) {
      window.parent?.postMessage(payload, '*')
    }
  }
  /**
   * 🔄 启动重连机制
   */
  startReconnectProcess() {
    if (this.isReconnecting.value) return;
    
    if (this.reconnectConfig.retryCount >= this.reconnectConfig.maxRetries) {
      console.error(`❌ 已达到最大重连次数 (${this.reconnectConfig.maxRetries})`);
      this.connectionQuality.value = 'offline';
      this.emit('reconnectFailed');
      return;
    }
    
    this.isReconnecting.value = true;
    this.reconnectConfig.retryCount++;
    
    const interval = Math.min(
      this.reconnectConfig.retryInterval * Math.pow(this.reconnectConfig.backoffFactor, this.reconnectConfig.retryCount - 1),
      this.reconnectConfig.maxInterval
    );
    
    console.log(`🔄 将在 ${interval}ms 后进行第 ${this.reconnectConfig.retryCount} 次重连`);
    
    setTimeout(() => {
      this.isReconnecting.value = false;
      this.emit('reconnecting', this.reconnectConfig.retryCount);
      this.connect();
    }, interval);
  }
  
  /**
   * 📤 发送消息（带缓存）
   */
  send(message) {
    const messageObj = typeof message === 'string' ? { data: message } : message;

    if (this.transport === 'bridge' && this.bridgeClient?.ready) {
      try {
        this.bridgeClient.send(messageObj);
        return true;
      } catch (e) {
        console.error('❌ Bridge 发送失败，回退缓存:', e);
        this.cacheMessage(messageObj);
        return false;
      }
    }
    
    if (this.isConnected.value && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(messageObj));
        console.log('📤 消息已发送:', messageObj.type || 'data');
        return true;
      } catch (error) {
        console.error('❌ 发送消息失败:', error);
        this.cacheMessage(messageObj);
        return false;
      }
    } else {
      console.warn('⚠️ WebSocket未连接，消息已缓存');
      this.cacheMessage(messageObj);
      return false;
    }
  }
  
  /**
   * 📥 缓存消息
   */
  cacheMessage(message) {
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift();
    }
    
    this.messageQueue.push({
      ...message,
      timestamp: Date.now(),
      retries: 0
    });
    
    console.log(`📥 消息已缓存 (队列长度: ${this.messageQueue.length})`);
  }
  
  /**
   * 📤 处理缓存的消息
   */
  processCachedMessages() {
    if (this.messageQueue.length === 0) return;
    
    console.log(`📤 处理 ${this.messageQueue.length} 个缓存消息`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach((message, index) => {
      setTimeout(() => {
        if (this.isConnected.value) {
          delete message.timestamp;
          delete message.retries;
          this.send(message);
        } else {
          this.cacheMessage(message);
        }
      }, index * 100);
    });
  }
  
  /**
   * 📨 处理接收到的消息
   */
  handleMessage(data) {
    switch (data.type) {
      case 'hardwareStatus':
        this.hardwareStatus.connected = data.data?.connected || false;
        this.hardwareStatus.ip = data.data?.ip;
        break;
      case 'deviceInfo':
      case 'devices':
      case 'parameterUpdateResults':
      case 'commandResult':
      case 'deviceUpdate':
        // 这些消息由具体界面处理
        break;
      default:
        console.log('🔍 未处理的消息类型:', data.type);
    }
  }
  
  /**
   * 🔧 分析连接质量
   */
  analyzeConnectionQuality() {
    const disconnects = this.hardwareStatus.totalDisconnects;
    
    if (disconnects > 10) {
      this.connectionQuality.value = 'poor';
    } else if (disconnects > 20) {
      this.connectionQuality.value = 'offline';
    } else {
      this.connectionQuality.value = 'good';
    }
  }
  
  /**
   * 📝 事件监听
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  /**
   * 🔇 移除事件监听
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * 📢 触发事件
   */
  emit(event, data) {
    if (!this.eventListeners.has(event)) return;
    
    this.eventListeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`事件回调错误 (${event}):`, error);
      }
    });
  }
  
  /**
   * 🔌 手动重连
   */
  manualReconnect() {
    console.log('🔄 手动重连');
    this.reconnectConfig.retryCount = 0;
    this.isReconnecting.value = false;
    
    if (this.ws) {
      this.ws.close();
    }
    
    setTimeout(() => this.connect(), 1000);
  }
  
  /**
   * 🔌 断开连接
   */
  disconnect() {
    if (this.transport === 'bridge') {
      try {
        this.bridgeClient?.teardown();
      } catch {}
      this.isConnected.value = false;
      return;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected.value = false;
  }
  
  /**
   * 📊 获取连接信息
   */
  getConnectionInfo() {
    return {
      connected: this.isConnected.value,
      quality: this.connectionQuality.value,
      retryCount: this.reconnectConfig.retryCount,
      maxRetries: this.reconnectConfig.maxRetries,
      isReconnecting: this.isReconnecting.value,
      queueSize: this.messageQueue.length,
      totalDisconnects: this.hardwareStatus.totalDisconnects,
      lastConnected: this.hardwareStatus.lastConnectedTime,
      hardwareStatus: this.hardwareStatus
    };
  }
  
  /**
   * 🎯 发送设备命令（统一格式）
   */
  sendDeviceCommand(deviceId, deviceType, action, parameters = {}) {
    return this.send({
      type: 'updateDeviceParameters',
      payload: [{
        id: deviceId,
        type: deviceType,
        action: action,
        parameters: parameters
      }]
    });
  }
  
  /**
   * 🎯 发送批量设备命令
   */
  sendBatchDeviceCommands(commands) {
    return this.send({
      type: 'updateDeviceParameters',
      payload: commands
    });
  }

  /**
   * 尝试初始化 iframe 桥接（父应用统一连接）
   * 成功时：this.transport='bridge'，并触发 connected 事件
   */
  async tryInitBridge() {
    try {
      if (typeof window === 'undefined') return false;
      if (window.parent === window) return false; // 非 iframe 环境

      const BRIDGE_TIMEOUT = 2000;
      const child = {
        id: null,
        ready: false
      };

      const onMessage = (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.kind === 'BRIDGE_ACK') {
          child.id = data.childId;
          child.ready = true;

          // 标记“已连接”
          this.transport = 'bridge';
          this.bridgeClient = createBridgeClient(child.id, this);
          this.isConnected.value = true;
          this.connectionQuality.value = 'good';
          this.emit('connected', { via: 'bridge' });

          // 默认订阅常用类型，减少无关推送
          this.bridgeClient.subscribe(['hardwareStatus', 'devices', 'parameterUpdateResults', 'commandResult']);

          // 初始化拉取状态
          setTimeout(() => {
            this.send({ type: 'getHardwareStatus' });
            this.send({ type: 'getDevices' });
          }, 200);
        }

        if (data.kind === 'WS_EVENT') {
          // 父桥推送事件 → 复用原有处理逻辑
          const wrapped = { type: data.type, data: data.data, correlationId: data.correlationId };
          this.handleMessage(wrapped);
          this.emit('message', wrapped);
        }
      };

      window.addEventListener('message', onMessage, false);
      // 发送握手
      window.parent.postMessage({ kind: 'BRIDGE_HELLO', app: 'Chem_new-main' }, '*');

      // 等待 ACK
      const ok = await new Promise((resolve) => {
        const t = setTimeout(() => resolve(false), BRIDGE_TIMEOUT);
        const check = () => {
          if (child.ready) {
            clearTimeout(t);
            resolve(true);
          } else {
            // 轮询检查
            setTimeout(check, 50);
          }
        };
        check();
      });

      if (!ok) {
        window.removeEventListener('message', onMessage, false);
      }
      return ok;
    } catch (e) {
      console.warn('桥接初始化失败，回退到直连 WS:', e);
      return false;
    }
  }
}


// Bridge 客户端实现：通过 postMessage 与父桥通信
function createBridgeClient(childId, owner) {
  const api = {
    ready: true,
    send(msg) {
      const { type, payload, correlationId } = msg || {};
      window.parent.postMessage({ kind: 'WS_SEND', type, payload, correlationId, childId }, '*');
    },
    subscribe(types) {
      window.parent.postMessage({ kind: 'WS_SUBSCRIBE', types, childId }, '*');
    },
    unsubscribe(types) {
      window.parent.postMessage({ kind: 'WS_UNSUBSCRIBE', types, childId }, '*');
    },
    teardown() {
      window.parent.postMessage({ kind: 'WS_UNSUBSCRIBE_ALL', childId }, '*');
    }
  };
  return api;
}

// 创建单例实例
const sharedConnectionManager = new SharedConnectionManager();

export default sharedConnectionManager;
