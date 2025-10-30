<template>
  <div class="main-container">

    <!-- Toolbar - Always visible, includes reaction path button -->
    <div class="toolbar">
      <!-- Reaction path button - Show in non-edit mode -->
      <button 
        v-if="!isEditMode"
        class="tool-button reaction-path-button"
        :class="{ 'active': isShowingReactionPath }"
        @click="toggleReactionPathPanel"
      >
        Reaction Path
      </button>
    </div>

    <!-- Select reaction path sidebar -->
    <div
      class="sidebar path-selector-sidebar"
      :class="{
        'sidebar-collapsed': !appSidebarOpened,
        'sidebar-hidden': !isSidebarOpen
      }"
    >
      <h3>Select Hardware Structure</h3>
      
      <!-- User saved hardware structures -->
      <div v-if="savedPaths.length > 0" class="path-section">
        <h4>Custom Structures</h4>
        <div class="path-options">
          <div 
            v-for="path in savedPaths" 
            :key="path.name"
            class="path-option custom-path"
            :class="{ 'selected': selectedPath && selectedPath.name === path.name }"
          >
            <span @click="loadStructureFromFile(path)">{{ path.name }}</span>
          </div>
        </div>
      </div>
      
      <!-- Icon legend area -->
      <div class="icons-legend-section">
        <h4>Device Icon Legend</h4>
        <div class="icons-legend">
          <div class="legend-item">
            <img :src="pump" class="legend-icon" />
            <span>Pump - For precise liquid flow control</span>
          </div>
          <div class="legend-item">
            <img :src="valve" class="legend-icon" />
            <span>Valve - Controls fluid channel on/off</span>
          </div>
          <div class="legend-item">
            <img :src="chip" class="legend-icon" />
            <span>Heating Chip - Controls reaction temperature</span>
          </div>
          <div class="legend-item">
            <img :src="bottle" class="legend-icon" />
            <span>Bottle - Stores reactants or products</span>
          </div>
          <div class="legend-item">
            <img :src="mfc" class="legend-icon" />
            <span>MFC Controller - Controls gas flow rate</span>
          </div>
          <div class="legend-item">
            <img :src="light" class="legend-icon" />
            <span>Light Control - Provides photocatalytic conditions</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading...</div>
    </div>
    
    <!-- Error message -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
      <button class="close-error-btn" @click="errorMessage = ''">×</button>
    </div>

    <!-- G6 画布容器 -->
    <div
      ref="container"
      class="graph-container"
      :class="{
        'graph-container-full': !isSidebarOpen,
        'graph-container-collapsed': !appSidebarOpened && isSidebarOpen,
      }"
    />

    <!-- 设备控制面板 -->
    <div 
      v-if="showControlPanel" 
      class="device-control-panel"
      :style="{ 
        left: panelPosition.x + 'px', 
        top: panelPosition.y + 'px' 
      }"
    >
      <div class="panel-content">
        <!-- Device ID and status -->
        <div class="device-info">
          <div 
            class="device-header draggable-header"
            @mousedown="startDrag"
          >
            <div class="drag-handle">⋮⋮</div>
            <div class="device-title">Device Control: {{ deviceData.id }}</div>
            <div class="data-source-indicator" :class="{ 'connected': isHardwareConnected, 'disconnected': !isHardwareConnected }">
              {{ isHardwareConnected ? 'Connected to hardware device' : 'Hardware device not connected' }}
            </div>
          <button class="close-btn" @click="closeControlPanel">×</button>
          </div>
          <div class="device-status" :class="deviceData.status">
            Status: {{ translateStatus(deviceData.status) }}
          </div>
        </div>

        <!-- Pump control -->
        <div v-if="deviceData.type === 'pump'" class="device-controls">
          <!-- Current status section -->
          <div class="current-status-section">
            <div class="section-title">Current Status</div>
            <div class="status-row">
              <span class="status-label">Current Speed:</span>
              <span class="status-value">{{ deviceData.speed }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Current Position:</span>
              <span class="status-value">{{ deviceData.position }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Aspirate Port:</span>
              <span class="status-value">{{ deviceData.aspiratePort }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Dispense Port:</span>
              <span class="status-value">{{ deviceData.dispensePort }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Flow Rate:</span>
              <span class="status-value">{{ deviceData.flowRate }}</span>
            </div>
          </div>
          
          <!-- Control section -->
          <div class="control-section">
            <div class="section-title">Parameter Adjustment</div>
            <div class="data-row">
              <span>Aspirate Port:</span>
              <select 
                v-model.number="controlParams.aspiratePort" 
                @change="updateParameter(deviceData.id, 'pump', 'aspiratePort', controlParams.aspiratePort)"
                class="parameter-select"
              >
                <option value="1">Port 1</option>
                <option value="2">Port 2</option>
                <option value="3">Port 3</option>
                <option value="4">Port 4</option>
                <option value="5">Port 5</option>
                <option value="6">Port 6</option>
              </select>
            </div>
            
            <div class="data-row">
              <span>Dispense Port:</span>
              <select 
                v-model.number="controlParams.dispensePort" 
                @change="updateParameter(deviceData.id, 'pump', 'dispensePort', controlParams.dispensePort)"
                class="parameter-select"
              >
                <option value="1">Port 1</option>
                <option value="2">Port 2</option>
                <option value="3">Port 3</option>
                <option value="4">Port 4</option>
                <option value="5">Port 5</option>
                <option value="6">Port 6</option>
              </select>
            </div>
            
            <div class="data-row">
              <span>Speed:</span>
              <input
                v-model.number="controlParams.speed"
                type="number"
                min="0"
                max="1000"
                class="parameter-input"
              />
              <button
                @click="updateParameter(deviceData.id, 'pump', 'speed', controlParams.speed)"
              >
                Set
              </button>
            </div>
            
            <div class="data-row">
              <span>Position:</span>
              <input
                v-model.number="controlParams.position"
                type="number"
                min="0"
                max="10000"
                class="parameter-input"
              />
              <button
                @click="updateParameter(deviceData.id, 'pump', 'position', controlParams.position)"
              >
                Set
              </button>
            </div>
            
            <div class="control-row">
              <button
                @click="updateParameter(deviceData.id, 'pump', 'initialize', controlParams.initialize)"
              >
                Initialize
              </button>
              <button
                @click="updateParameter(deviceData.id, 'pump', 'stop', controlParams.stop)"
              >
                Stop
              </button>
            </div>
          </div>
        </div>

        <!-- Valve control -->
        <div v-if="deviceData.type === 'valve'" class="device-controls">
          <!-- Current status section -->
          <div class="current-status-section">
            <div class="section-title">Current Status</div>
            <div class="status-row">
              <span class="status-label">Current Position:</span>
              <span class="status-value">{{ deviceData.position }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Product Collection Valve:</span>
              <span class="status-value">{{ deviceData.isProductValve ? 'Yes' : 'No' }}</span>
            </div>
          </div>
          
          <!-- Control section -->
          <div class="control-section">
            <div class="section-title">Parameter Adjustment</div>
            <div class="control-row">
              <span>Position:</span>
              <select v-model.number="controlParams.port" class="parameter-select">
                <option v-for="n in 6" :key="n" :value="n">Position {{ n }}</option>
              </select>
              <button
                @click="updateParameter(deviceData.id, 'valve', 'port', controlParams.port)"
              >
                Set Position
              </button>
            </div>
            <div class="control-row">
              <span>Product Collection Valve:</span>
              <div class="toggle-switch">
                <input
                  type="checkbox"
                  :id="`product-toggle-${deviceData.id}`"
                  v-model="controlParams.isProductValve"
                  @change="updateParameter(deviceData.id, 'valve', 'isProductValve', controlParams.isProductValve)"
                />
                <label :for="`product-toggle-${deviceData.id}`">{{ controlParams.isProductValve ? 'Yes' : 'No' }}</label>
              </div>
              <div class="valve-info" v-if="controlParams.isProductValve">
                (Will switch only after reaction stabilizes)
              </div>
            </div>
          </div>
        </div>

        <!-- Heating chip control -->
        <div v-if="deviceData.type === 'chip'" class="device-controls">
          <!-- Current status section -->
          <div class="current-status-section">
            <div class="section-title">Current Status</div>
            <div class="status-row">
              <span class="status-label">Current Temperature:</span>
              <span class="status-value">{{ deviceData.currentTemp }}°C</span>
            </div>
            <div class="status-row">
              <span class="status-label">Target Temperature:</span>
              <span class="status-value">{{ deviceData.targetTemp }}°C</span>
            </div>
            <div class="status-row">
              <span class="status-label">Heating Speed:</span>
              <span class="status-value">{{ deviceData.heatingSpeed }}</span>
            </div>
          </div>
          
          <!-- Control section -->
          <div class="control-section">
            <div class="section-title">Parameter Adjustment</div>
            <div class="data-row">
              <span>Target Temperature:</span>
              <input
                v-model.number="controlParams.targetTemp"
                type="number"
                min="0"
                max="300"
                class="parameter-input"
              />
              <span class="unit">°C</span>
            </div>
            <div class="data-row">
              <span>Heating Speed:</span>
              <input
                v-model.number="controlParams.heatingSpeed"
                type="number"
                min="1"
                max="10"
                class="parameter-input"
              />
              <span class="unit"></span>
            </div>
            <div class="control-row">
              <button
                @click="updateParameter(deviceData.id, 'chip', 'setTemp', controlParams.targetTemp), updateParameter(deviceData.id, 'chip', 'speed', controlParams.heatingSpeed)"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        <!-- MFC control -->
        <div v-if="deviceData.type === 'mfc'" class="device-controls">
          <!-- Current status section -->
          <div class="current-status-section">
            <div class="section-title">Current Status</div>
            <div class="status-row">
              <span class="status-label">Current Flow Rate:</span>
              <span class="status-value">{{ deviceData.flowRate }}</span>
            </div>
          </div>
          
          <!-- Control section -->
          <div class="control-section">
            <div class="section-title">Parameter Adjustment</div>
            <div class="data-row">
              <span>Flow Rate Setting:</span>
              <input
                v-model.number="controlParams.flowRate"
                type="number"
                min="0"
                max="100"
                class="parameter-input"
              />
              <span class="unit">ml/min</span>
              <button
                @click="updateParameter(deviceData.id, 'mfc', 'setFlowRate', controlParams.flowRate)"
              >
                Set Flow Rate
              </button>
            </div>
          </div>
        </div>

        <!-- Light control -->
        <div v-if="deviceData.type === 'light'" class="device-controls">
          <!-- Current status section -->
          <div class="current-status-section">
            <div class="section-title">Current Status</div>
            <div class="status-row">
              <span class="status-label">Current Intensity:</span>
              <span class="status-value">{{ deviceData.intensity }}</span>
            </div>
          </div>
          
          <!-- Control section -->
          <div class="control-section">
            <div class="section-title">Parameter Adjustment</div>
            <div class="data-row">
              <span>Intensity Setting:</span>
              <input
                v-model.number="controlParams.intensity"
                type="number"
                min="0"
                max="100"
                class="parameter-input"
              />
              <span class="unit">%</span>
              <button
                @click="updateParameter(deviceData.id, 'light', 'setIntensity', controlParams.intensity)"
              >
                Set Intensity
              </button>
            </div>
          </div>
        </div>

        <!-- Bottle control -->
        <div v-if="deviceData.type === 'bottle'" class="device-controls">
          <!-- Current status section -->
          <div class="current-status-section">
            <div class="section-title">Current Status</div>
            <div class="status-row">
              <span class="status-label">Reactant:</span>
              <span class="status-value">{{ deviceData.reactant || 'Not set' }}</span>
            </div>
          </div>
          
          <!-- Control section -->
          <div class="control-section">
            <div class="section-title">Parameter Adjustment</div>
            <div class="control-row">
              <label for="reactant">Reactant:</label>
              <input
                id="reactant"
                v-model="controlParams.reactant"
                type="text"
                placeholder="Enter reactant name"
                class="reactant-input"
              />
              <button
                @click="updateBottle(deviceData.id, 'reactant', controlParams.reactant)"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- WebSocket connection status -->
    <div class="ws-status" :class="{ 'connected': wsConnected }">
      <span v-if="wsConnected">Connected to server</span>
      <span v-else">Not connected to server</span>
    </div>

    <!-- WebSocket connection status indicator -->
    <div class="websocket-status-container" :class="{ 'ws-connected': wsConnected, 'ws-disconnected': !wsConnected }">
      <div class="status-indicator"></div>
      <span class="status-text">{{ wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected' }}</span>
      <div v-if="!wsConnected" class="reconnect-controls">
        <el-tooltip effect="dark" placement="bottom">
          <template #content>
            <div>
              <p>Possible causes:</p>
              <ul>
                <li>Backend service not started</li>
                <li>Network connection issues</li>
                <li>Cross-origin policy restrictions</li>
              </ul>
              <p>Troubleshooting steps:</p>
              <ul>
                <li>Ensure backend service is running on port 3000</li>
                <li>Check browser console for error messages</li>
                <li>Check browser network requests</li>
              </ul>
            </div>
          </template>
          <el-button type="warning" size="small" icon="Warning">Connection Failure Reasons</el-button>
        </el-tooltip>
        <el-button type="primary" size="small" @click="reconnectWebSocket">Reconnect</el-button>
      </div>
      <div v-if="wsConnected" class="connection-info">
        <span class="data-source-indicator" :class="{ 'connected': isHardwareConnected, 'disconnected': !isHardwareConnected }">
          {{ isHardwareConnected ? 'Connected to hardware device' : 'Hardware device not connected' }}
        </span>
      </div>
    </div>

    <!-- Device selection dialog -->
    <div v-if="showDeviceSelectionDialog" class="dialog-overlay">
      <div class="dialog-content device-selection-dialog">
        <h3>Select {{ getDeviceTypeName(dropPosition.type) }}</h3>
        
        <!-- Search box -->
        <div class="search-box">
          <input 
            v-model="deviceSearchQuery" 
            type="text" 
            placeholder="Search device ID..."
            @input="filterDevices"
          />
        </div>
        
        <!-- Device list -->
        <div class="device-list">
          <div v-if="filteredDevices.length === 0" class="no-devices">
            No available {{ getDeviceTypeName(dropPosition.type) }} devices
          </div>
          
          <!-- Device group display -->
          <template v-for="(group, index) in deviceGroups" :key="index">
            <div class="device-group" v-if="group.devices.length > 0">
              <div class="group-title">{{ group.title }}</div>
              <div 
                v-for="device in group.devices" 
                :key="device.id"
                class="device-item"
                @click="selectDeviceAndAddToGraph(device)"
              >
                <div class="device-info">
                  <div class="device-id">{{ device.id }}</div>
                  <div class="device-module-id" v-if="device.moduleMetadata">
                    模块ID: {{ device.moduleMetadata.moduleId }}
                  </div>
                </div>
                <div class="device-status" :class="device.status">
                  {{ translateStatus(device.status) }}
                </div>
              </div>
            </div>
          </template>
        </div>
        
        <div class="dialog-buttons">
          <button @click="showDeviceSelectionDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 合并的编辑控制面板 - 覆盖在反应路径面板右半边 -->
    <div v-if="isEditMode || showPendingChangesPanel" class="unified-edit-control-panel">
      <!-- 编辑模式头部 -->
      <div v-if="isEditMode" class="edit-mode-header">
        <div class="edit-mode-info">
          <div class="edit-mode-title">编辑模式：{{ editTaskData?.taskName }}</div>
          <div class="edit-mode-subtitle">({{ editTaskData?.taskKey }})</div>
          <!-- 反应路径状态显示 -->
          <div v-if="reactionPaths.length > 0 && selectedReactionPathIndex !== null" class="edit-path-status">
            <span class="path-indicator">反应路径: {{ reactionPaths[selectedReactionPathIndex]?.name }}</span>
            <span class="path-devices">设备数: {{ reactionPaths[selectedReactionPathIndex]?.nodes?.length || 0 }}</span>
          </div>
        </div>
        <div class="edit-mode-actions">
          <button 
            class="tool-button save-button"
            @click="saveParametersAndReturn"
            title="保存参数并返回任务页面"
          >
            保存参数
          </button>
          <button 
            class="tool-button cancel-button"
            @click="cancelEditAndReturn"
            title="取消编辑并返回"
          >
            取消
          </button>
        </div>
      </div>

      <!-- 参数变更队列部分 -->
      <div class="parameter-changes-section">
        <div class="panel-header">
          <div class="panel-title">
            <span v-if="isEditMode">参数变更队列</span>
            <span v-else>待发送参数更新</span>
            ({{ pendingChanges ? pendingChanges.size : 0 }}个设备)
          </div>
          <div class="panel-actions">
            <button 
              v-if="!isEditMode"
              class="send-all-btn" 
              @click="sendAllParameterChanges()" 
              :disabled="isCommandSending"
            >
              {{ isCommandSending ? '发送中...' : '发送所有参数更新' }}
            </button>
            <button 
              class="workflow-btn" 
              @click="generateWorkflowFromPendingChanges()" 
              :disabled="isCommandSending || !pendingChanges || pendingChanges.size === 0"
            >
              生成工作流并执行
            </button>
            <button class="clear-btn" @click="pendingChanges ? pendingChanges.clear() : null">清空</button>
            <button 
              v-if="!isEditMode"
              class="close-panel-btn" 
              @click="showPendingChangesPanel = false" 
              title="关闭面板"
            >×</button>
          </div>
        </div>
        
        <div class="changes-list">
          <template v-if="pendingChanges && pendingChanges.size > 0">
            <div v-for="[deviceId, changes] in Array.from(pendingChanges.entries())" :key="deviceId" class="change-item">
              <div class="device-info">
                <span class="device-type">{{ translateDeviceType(deviceId.split('_')[0] || '未知') }}</span>
                <span class="device-id">{{ deviceId.split('_')[1] }}</span>
              </div>
              <div class="changes-info">
                <template v-if="changes && changes.params">
                  <div v-for="(value, param) in changes.params" :key="`${deviceId}-${param}`" class="parameter">
                    {{ translateParameterName(param, deviceId.split('_')[0]) }}: {{ value }}
                  </div>
                </template>
              </div>
              <button class="remove-btn" @click="pendingChanges ? pendingChanges.delete(deviceId) : null">×</button>
            </div>
          </template>
          <div v-else class="no-changes">
            没有待发送的参数变更
          </div>
        </div>
      </div>
    </div>

    <!-- 流程执行面板 -->
    <div v-if="isRunningWorkflow" class="workflow-execution-panel">
      <div class="execution-header">
        <h3>正在执行: {{ currentWorkflow.name }}</h3>
        <div class="execution-controls">
          <button 
            @click="pauseOrResumeWorkflow" 
            class="execution-control-btn"
            :class="{ 'pause': workflowExecutor.status === 'running', 'resume': workflowExecutor.status === 'paused' }"
          >
            {{ workflowExecutor.status === 'running' ? '暂停' : '继续' }}
          </button>
          <button @click="stopWorkflow" class="execution-control-btn stop">终止</button>
        </div>
      </div>
      
      <div class="execution-progress">
        <div class="progress-info">
          <span>步骤: {{ workflowExecutor.activeStepIndex + 1 }}/{{ currentWorkflow.steps.length }}</span>
          <span>状态: {{ translateExecutionStatus(workflowExecutor.status) }}</span>
        </div>
        
        <el-progress 
          :percentage="calculateProgress()" 
          :status="getProgressStatus()"
          :stroke-width="15"
        ></el-progress>
      </div>
      
      <div class="execution-steps">
        <div 
          v-for="(step, index) in currentWorkflow.steps" 
          :key="step.id"
          class="execution-step"
          :class="{
            'completed-step': index < workflowExecutor.activeStepIndex,
            'active-step': index === workflowExecutor.activeStepIndex,
            'pending-step': index > workflowExecutor.activeStepIndex
          }"
        >
          <div class="step-indicator">
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-status-icon">
              <i v-if="index < workflowExecutor.activeStepIndex" class="el-icon-check"></i>
              <i v-else-if="index === workflowExecutor.activeStepIndex && workflowExecutor.status === 'running'" class="el-icon-loading"></i>
              <i v-else-if="index === workflowExecutor.activeStepIndex && workflowExecutor.status === 'paused'" class="el-icon-time"></i>
            </div>
          </div>
          <div class="step-content">
            <div class="step-name">{{ step.name || '未命名步骤' }}</div>
            <div class="step-description">{{ step.description || '无描述' }}</div>
          </div>
          <!-- 添加等待状态显示 -->
          <div class="step-waiting-status" v-if="index === workflowExecutor.activeStepIndex && workflowExecutor.waitingConditions">
            <div class="waiting-title">等待条件满足:</div>
            <div 
              v-for="(condition, condIndex) in workflowExecutor.waitingConditions" 
              :key="condIndex"
              class="waiting-condition"
            >
              <div class="condition-progress">
                <el-progress 
                  :percentage="condition.progress || 0"
                  :status="condition.timeout ? 'warning' : 'primary'"
                ></el-progress>
              </div>
              <div class="condition-desc">
                等待 {{ getDeviceTypeLabel(condition.deviceType) }} {{ condition.deviceId }} 
                {{ getParameterLabel(condition.parameter) }}
                {{ getComparisonLabel(condition.comparison) }}
                {{ condition.value }}{{ getUnitForParameter(condition.parameter) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 工作流预览对话框 -->
    <el-dialog
      title="工作流预览"
      v-model="showWorkflowPreviewDialog"
      width="800px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="workflow-preview-content">
        <div class="workflow-preview-header">
          <h3>{{ previewWorkflow?.name || '自动生成的工作流' }}</h3>
          <p class="workflow-preview-desc">{{ previewWorkflow?.description || '基于参数变更队列自动生成的工作流' }}</p>
          <div class="workflow-preview-meta">
            <span>{{ previewWorkflow?.steps?.length || 0 }}个步骤</span>
            <span>{{ formatDate(previewWorkflow?.createdAt) }}</span>
          </div>
        </div>
        
        <div class="workflow-preview-steps">
          <div 
            v-for="(step, index) in previewWorkflow?.steps || []" 
            :key="step.id" 
            class="workflow-preview-step"
          >
            <div class="preview-step-header">
              <div class="preview-step-number">{{ index + 1 }}</div>
              <div class="preview-step-name">{{ step.name }}</div>
            </div>
            <div class="preview-step-content">
              <div class="preview-step-desc">{{ step.description }}</div>
              
              <div class="preview-commands-list">
                <h4>设备命令 ({{ step.deviceCommands.length }})</h4>
                <div class="preview-commands-scroll">
                  <div v-for="(cmd, cmdIndex) in step.deviceCommands" :key="cmdIndex" class="preview-command-item">
                    <div class="preview-command-device">
                      <span class="preview-device-type">{{ translateDeviceType(cmd.deviceType) }}</span>
                      <span class="preview-device-id">{{ cmd.deviceId }}</span>
                    </div>
                    <div class="preview-command-action">
                      {{ translateActionName(cmd.action, cmd.deviceType) }}
                      <div class="preview-command-params" v-if="cmd.parameters && Object.keys(cmd.parameters).length > 0">
                        <div v-for="(value, key) in cmd.parameters" :key="key" class="preview-param">
                          {{ translateParamName(key) }}: <span class="param-value">{{ value }}{{ getParameterUnit(key) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 条件和延迟时间 -->
              <div class="preview-step-conditions" v-if="step.conditions && step.conditions.length > 0">
                <h4>执行条件 ({{ step.conditions.length }})</h4>
                <div class="preview-condition-item" v-for="(condition, condIndex) in step.conditions" :key="condIndex">
                  <div class="condition-type">{{ translateConditionType(condition.type) }}</div>
                  <div class="condition-details">
                    <div v-if="condition.type === 'deviceStatus'">
                      等待 {{ translateDeviceType(condition.deviceType) }} {{ condition.deviceId }} 
                      状态变为 {{ translateStatus(condition.status) }}
                      (超时: {{ condition.timeout || 60 }}秒)
                    </div>
                    <div v-else-if="condition.type === 'timeout'">
                      等待 {{ condition.duration }}秒
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="preview-step-delay" v-if="step.conditions && step.conditions.length > 0">
                <div class="delay-icon">🔄</div>
                <div class="delay-text">等待设备状态满足预设条件后继续</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showWorkflowPreviewDialog = false">取消</el-button>
          <!-- 🎯 新增：保存任务参数按钮 - 仅在编辑模式下显示 -->
          <el-button 
            v-if="isEditMode" 
            type="warning" 
            @click="saveTaskParametersFromWorkflow"
            :disabled="!pendingChanges || pendingChanges.size === 0"
          >
            保存任务参数
          </el-button>
          <el-button type="primary" @click="executePreviewedWorkflow">执行工作流</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 反应路径选择面板 - 新增 -->
    <div v-if="isShowingReactionPath" class="reaction-path-panel"
         :class="{
           'sidebar-collapsed': !appSidebarOpened,
           'sidebar-hidden': !isSidebarOpen
         }">
      <div class="panel-header">
        <div class="panel-title">反应路径</div>
        <button class="close-btn" @click="isShowingReactionPath = false">×</button>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="isLoadingReactionPaths" class="loading-paths">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载反应路径数据中...</div>
      </div>
      
      <!-- 错误信息 -->
      <div v-else-if="reactionPathsError" class="path-error">
        <div class="error-icon">!</div>
        <div class="error-text">{{ reactionPathsError }}</div>
        <button class="retry-btn" @click="loadMappingData">重试</button>
      </div>
      
      <!-- 反应路径列表 -->
      <div v-else class="reaction-paths-list">
        <div v-for="(path, index) in reactionPaths" :key="index" class="reaction-path-item" 
          :class="{'active': selectedReactionPathIndex === index}"
          @click="selectReactionPath(index)">
          <div class="path-name">{{ path.name }}</div>
          <div class="path-info">{{ path.description }}</div>
        </div>
        
        <div v-if="reactionPaths.length === 0" class="no-paths">
          暂无可用反应路径
        </div>
      </div>
      
      <div v-if="selectedReactionPathIndex !== null" class="path-actions">
        <div class="path-action-instructions">
          <div class="instruction-step">
            <div class="step-icon">1</div>
            <div class="step-text">点击各设备节点设置参数</div>
          </div>
          <div class="instruction-step">
            <div class="step-icon">2</div>
            <div class="step-text">在参数变更队列面板点击"生成工作流并执行"</div>
          </div>
        </div>
        <button class="clear-path-btn" @click="clearReactionPathHighlight">清除高亮</button>
      </div>
    </div>
    
    <!-- 增强版标准参数配置对话框 -->
    <el-dialog
      v-model="showStandardParamsDialog"
      title="反应路径参数配置"
      width="800px"
      :destroy-on-close="false"
    >
      <div class="standard-workflow-params">
        <h3>请为 "{{ reactionPaths[selectedReactionPathIndex]?.name || '未选择' }}" 反应路径设置参数</h3>
        
        <el-form label-position="top">
          <!-- 基本反应参数设置 -->
          <el-divider content-position="left">基本反应参数</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="反应温度 (°C)">
                <el-input-number v-model="standardParams.reactionTemp" :min="0" :max="300" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="反应时间 (分钟)">
                <el-input-number v-model="standardParams.reactionTime" :min="1" :max="600" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="反应体积 (μL)">
                <el-input-number v-model="standardParams.reactionVolume" :min="10" :max="1000" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <!-- 泵设置 -->
          <el-divider content-position="left">泵设置</el-divider>
          <div v-for="(pump, index) in pathPumps" :key="`pump-${pump.id}`" class="device-param-container">
            <div class="device-header">
              <h4>{{ pump.id }}</h4>
              <el-switch v-model="standardParams.enabledPumps[pump.id]" active-text="启用" inactive-text="禁用" />
            </div>
            <el-row :gutter="20" v-if="standardParams.enabledPumps[pump.id]">
              <el-col :span="6">
                <el-form-item label="泵速度 (%)">
                  <el-input-number v-model="standardParams.pumpSpeeds[pump.id]" :min="1" :max="100" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="抽取体积 (μL)">
                  <el-input-number v-model="standardParams.pumpVolumes[pump.id]" :min="10" :max="1000" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="反应物进液端口">
                  <el-select v-model="standardParams.pumpPorts[pump.id]">
                    <el-option v-for="port in 5" :key="`in-${port}`" :label="`端口 ${port}`" :value="port" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="产品出液端口">
                  <el-select v-model="standardParams.pumpOutPorts[pump.id]">
                    <el-option v-for="port in 5" :key="`out-${port}`" :label="`端口 ${port}`" :value="port" />
                    <el-option key="waste" label="端口 6 (废液)" :value="6" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="反应物">
                  <el-input v-model="standardParams.pumpReagents[pump.id]" placeholder="输入反应物名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="反应物浓度">
                  <el-input v-model="standardParams.pumpConcentrations[pump.id]" placeholder="例如: 0.1 M" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
          
          <!-- 阀门设置 -->
          <el-divider content-position="left">阀门设置</el-divider>
          <div v-for="(valve, index) in pathValves" :key="`valve-${valve.id}`" class="device-param-container">
            <div class="device-header">
              <h4>{{ valve.id }}</h4>
              <div>
                <el-checkbox v-model="standardParams.valvesToProduct[valve.id]">连接产品</el-checkbox>
                <el-checkbox v-model="standardParams.valvesToWaste[valve.id]">连接废液</el-checkbox>
              </div>
            </div>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="初始阀门孔位">
                  <el-select v-model="standardParams.valvePorts[valve.id]">
                    <el-option v-for="pos in 6" :key="pos" :label="`孔位 ${pos}`" :value="pos" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="产品收集阀门孔位" v-if="standardParams.valvesToProduct[valve.id]">
                  <el-select v-model="standardParams.valveProductPorts[valve.id]">
                    <el-option v-for="pos in 6" :key="pos" :label="`孔位 ${pos}`" :value="pos" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
          
          <!-- 加热器设置 -->
          <el-divider content-position="left">加热器设置</el-divider>
          <div v-for="(heater, index) in pathHeaters" :key="`heater-${heater.id}`" class="device-param-container">
            <div class="device-header">
              <h4>{{ heater.id }}</h4>
              <el-switch v-model="standardParams.enabledHeaters[heater.id]" active-text="启用" inactive-text="禁用" />
            </div>
            <el-row :gutter="20" v-if="standardParams.enabledHeaters[heater.id]">
              <el-col :span="12">
                <el-form-item label="反应温度 (°C)">
                  <el-input-number v-model="standardParams.heaterTemps[heater.id]" :min="25" :max="300" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="加热速率">
                  <el-input-number v-model="standardParams.heaterSpeeds[heater.id]" :min="1" :max="20" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
          
          <!-- 清洗设置 -->
          <el-divider content-position="left">清洗设置</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="清洗溶液体积 (μL)">
                <el-input-number v-model="standardParams.cleaningVolume" :min="50" :max="2000" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="清洗次数">
                <el-input-number v-model="standardParams.cleaningCycles" :min="1" :max="5" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="清洗端口">
                <el-select v-model="standardParams.cleaningPort">
                  <el-option v-for="port in 5" :key="`clean-${port}`" :label="`端口 ${port}`" :value="port" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <!-- 步骤说明 -->
          <el-divider content-position="left">反应步骤预览</el-divider>
          <div class="workflow-steps-preview">
            <div class="step-preview-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <div class="step-title">初始化反应路径</div>
                <div class="step-desc">启动所有阀门并设置为初始孔位，启动加热芯片至目标温度</div>
              </div>
            </div>
            <div class="step-preview-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <div class="step-title">泵润洗</div>
                <div class="step-desc">将泵排空至废液口进行润洗</div>
              </div>
            </div>
            <div class="step-preview-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <div class="step-title">抽吸反应溶液</div>
                <div class="step-desc">泵从指定端口抽取反应溶液</div>
              </div>
            </div>
            <div class="step-preview-item">
              <div class="step-number">4</div>
              <div class="step-content">
                <div class="step-title">反应运行</div>
                <div class="step-desc">启动泵输出反应溶液，保持稳定反应{{standardParams.reactionTime}}分钟</div>
              </div>
            </div>
            <div class="step-preview-item">
              <div class="step-number">5</div>
              <div class="step-content">
                <div class="step-title">产品收集</div>
                <div class="step-desc">打开与产品收集相连的阀门</div>
              </div>
            </div>
            <div class="step-preview-item">
              <div class="step-number">6</div>
              <div class="step-content">
                <div class="step-title">废液排出</div>
                <div class="step-desc">切换连接废液孔位的阀门，准备系统清洗</div>
              </div>
            </div>
            <div class="step-preview-item">
              <div class="step-number">7</div>
              <div class="step-content">
                <div class="step-title">系统清洗</div>
                <div class="step-desc">泵抽取清洗溶液并冲洗管道系统，完成{{standardParams.cleaningCycles}}次循环</div>
              </div>
            </div>
          </div>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showStandardParamsDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmGenerateWorkflow">生成工作流</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, reactive } from "vue";
import { Graph } from "@antv/g6";
import { useAppStoreHook } from "@/store/modules/app";
import axios from "axios";
import { saveAs } from 'file-saver'; // 需要安装 file-saver 库用于保存文件
import { ElMessage,ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
// 🔧 引入优化的WebSocket通信模块
import { TopControlWebSocketManager } from '@/views/topcontrol/optimized-websocket.js';
import enhancedStatusMonitor from '@/views/topcontrol/enhanced-status-monitor.js';
import stateSyncOptimizer from '@/views/topcontrol/state-sync-optimizer.js';
const router = useRouter();

// 引入图片文件
import pump from "@/assets/jpg/pump.jpg";
import valve from "@/assets/jpg/valve.jpg";
import chip from "@/assets/jpg/chip.jpg";
import mfc from "@/assets/svg/mfc.svg?url"; // 保留原有mfc图标
import light from "@/assets/svg/light.svg?url"; // 保留原有light图标
import bottle from "@/assets/jpg/bottle.jpg";

const isAdmin = ref(true);
const isSidebarOpen = ref(true);
const isLoading = ref(false); // 添加加载状态
const errorMessage = ref(""); // 添加错误信息

// 添加任务编辑模式相关的状态
const isEditMode = ref(false);
const editTaskData = ref(null);
const deviceParameters = ref({});  // 存储设备参数

// 流程模式状态
const isWorkflowMode = ref(false);
const isRunningWorkflow = ref(false);
const selectedStepIndex = ref(-1);
const loadWorkflowDialog = ref(false);

// 添加标准工作流参数状态
const showStandardParamsDialog = ref(false);
const standardParams = reactive({
  valvePorts: {}, // 阀门孔位设置
  valveProductPorts: {}, // 产品收集阀门孔位
  valvesToProduct: {}, // 连接产品的阀门
  valvesToWaste: {}, // 连接废液的阀门
  heaterTemps: {}, // 加热器温度
  heaterSpeeds: {}, // 加热器升温速率
  pumpSpeeds: {}, // 泵速度
  pumpVolumes: {}, // 泵抽取体积 
  pumpPorts: {}, // 泵进液端口
  pumpOutPorts: {}, // 泵出液端口
  cleaningVolume: 100, // 默认清洗体积
  reactionTime: 30, // 默认反应时间(分钟)
});

// 从反应路径中提取的设备
const pathValves = ref([]);
const pathPumps = ref([]);
const pathHeaters = ref([]);

// 当前编辑的流程
const currentWorkflow = reactive({
  id: '',
  name: '',
  description: '',
  steps: [],
  createdAt: null,
  updatedAt: null
});
// 已保存的流程列表
const savedWorkflows = ref([]);

// 获取应用侧边栏状态
const pureApp = useAppStoreHook();
const appSidebarOpened = computed(() => pureApp.getSidebarStatus);

const container = ref(null);
let graph = null;

const selectedDevice = ref(null);
const deviceData = ref({}); // 当前设备状态数据（由下位机更新）
const controlParams = ref({}); // 新增：控制参数数据（用于用户调整参数）


// 已有的硬件结构列表
const savedPaths = ref([]);


const selectedPath = ref(null);
const selectedControllerIndex = ref(1); // 设置默认控制器索引为1

// 存储用户修改的参数
const pendingChanges = ref(new Map());
// 控制参数变更队列面板显示
const showPendingChangesPanel = ref(false);

// 流程执行器
const workflowExecutor = reactive({
  currentWorkflow: null,
  activeStepIndex: -1,
  status: 'idle', // idle, running, paused, completed, error
  startTime: null,
  endTime: null,
  stepResults: new Map(), // 存储每个步骤的执行结果
  waitingConditions: [], // 当前正在等待的条件

  updateWaitingCondition(index, progress, timeout = false) {
    if(this.waitingConditions[index]) {
      this.waitingConditions[index].progress = progress;
      this.waitingConditions[index].timeout = timeout;
    }
  },
  
  async executeWorkflow(workflow) {
    this.currentWorkflow = workflow;
    this.status = 'running';
    this.activeStepIndex = 0;
    this.startTime = Date.now();
    this.stepResults.clear();
    
    try {
      while(this.activeStepIndex < workflow.steps.length && (this.status === 'running' || this.status === 'paused')) {
        // 如果暂停，等待恢复
        if(this.status === 'paused') {
          await new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if(this.status === 'running') {
                clearInterval(checkInterval);
                resolve();
              } else if(this.status === 'idle') {
                clearInterval(checkInterval);
                throw new Error('流程已终止');
              }
            }, 500);
          });
        }
        
        // 执行当前步骤
        const step = workflow.steps[this.activeStepIndex];
        
        console.log(`执行步骤 ${this.activeStepIndex + 1}: ${step.name}`);
        
        try {
          await this.executeStep(step);
          this.stepResults.set(step.id, { success: true });
        } catch(error) {
          console.error(`步骤 ${step.name} 执行失败:`, error);
          this.stepResults.set(step.id, { success: false, error: error.message });
          
          // 询问用户是否继续
          try {
            await ElMessageBox.confirm(
              `步骤 "${step.name}" 执行失败: ${error.message}\n是否继续执行后续步骤？`,
              '步骤执行失败',
              {
                confirmButtonText: '继续',
                cancelButtonText: '终止流程',
                type: 'warning',
              }
            );
            // 用户选择继续
          } catch (e) {
            // 用户选择终止
            throw new Error('用户终止了流程');
          }
        }
        
        this.activeStepIndex++;
        
        // 通知更新进度
        ElMessage.success(`已完成步骤 ${this.activeStepIndex}/${workflow.steps.length}: ${step.name}`);
      }
      
      if(this.status === 'running') {
        this.status = 'completed';
        this.endTime = Date.now();
        ElMessage.success(`流程 "${workflow.name}" 已成功完成！`);
      }
    } catch(error) {
      this.status = 'error';
      this.endTime = Date.now();
      console.error("流程执行错误:", error);
      ElMessage.error(`流程执行错误: ${error.message}`);
    }
  },
  
  async executeStep(step) {
    console.log(`开始执行步骤: ${step.name}`);
    
    // 检查步骤是否有前置条件
    if(step.conditions && step.conditions.length > 0) {
      console.log(`步骤 "${step.name}" 有 ${step.conditions.length} 个前置条件，开始检查...`);
      
      // 显示等待前置条件的UI提示
      this.waitingConditions = step.conditions.map((condition, index) => ({
        ...condition,
        progress: 0,
        index
      }));
      
      try {
        await this.checkConditions(step.conditions);
        console.log(`步骤 "${step.name}" 的前置条件已满足`);
        ElMessage.success(`前置条件已满足，开始执行步骤`);
      } catch (error) {
        console.error(`步骤 "${step.name}" 的前置条件检查失败:`, error);
        ElMessage.error(`前置条件未满足: ${error.message}`);
        throw error;
      } finally {
        this.waitingConditions = [];
      }
    }
    
    // 执行设备命令
    console.log(`开始发送 ${step.deviceCommands.length} 个设备命令...`);
    const commandPromises = step.deviceCommands.map(cmd => 
      this.sendDeviceCommand(cmd)
    );
    
    // 等待命令发送完成（注意：这只是发送完成，不是设备执行完成）
    try {
      const results = await Promise.all(commandPromises);
      console.log(`所有命令已成功发送，共 ${results.length} 个命令`);
    } catch (error) {
      console.error(`命令发送过程出错:`, error);
      ElMessage.error(`命令发送失败: ${error.message}`);
      throw error;
    }
    
    // 不论是否设置了waitForCompletion，都自动生成和检查完成条件
    // 这确保每个步骤都基于实际设备状态来确定完成条件
    
    // 自动从命令中生成完成条件
    const completionConditions = this.generateCompletionConditions(step.deviceCommands);
    
    if(completionConditions.length > 0) {
      // 显示等待信息
      ElMessage.info(`等待设备达到目标状态...共 ${completionConditions.length} 个条件需要检查`);
      
      // 设置UI等待状态
      this.waitingConditions = completionConditions.map((condition, index) => ({
        ...condition,
        progress: 0,
        index,
        deviceType: condition.deviceType,
        deviceId: condition.deviceId,
        parameter: condition.parameter || '状态',
        comparison: condition.comparison || 'eq',
        value: condition.value || condition.status
      }));
      
      try {
        // 检查所有完成条件
        await this.checkConditions(completionConditions);
        ElMessage.success(`设备已达到目标状态`);
      } catch (error) {
        console.error(`完成条件检查失败:`, error);
        ElMessage.error(`等待设备达到目标状态失败: ${error.message}`);
        throw error;
      } finally {
        this.waitingConditions = [];
      }
    } else {
      console.log(`步骤 "${step.name}" 没有生成任何完成条件，将继续执行`);
      
      // 如果没有自动生成完成条件但设置了waitForCompletion，则至少等待一个短暂时间
      if(step.waitForCompletion) {
        console.log(`步骤需要等待完成但没有具体条件，添加一个短暂等待时间（3秒）...`);
        await this.executeDelay(3);
      }
    }
    
    // 只有在明确设置了延迟时间的情况下才执行额外延迟
    if(step.delayAfter > 0) {
      console.log(`执行步骤后额外延迟 ${step.delayAfter} 秒...`);
      ElMessage.info(`步骤已完成，额外等待 ${step.delayAfter} 秒以确保系统稳定...`);
      await this.executeDelay(step.delayAfter);
    }
    
    console.log(`步骤 "${step.name}" 执行完成`);
  },
  
  async sendDeviceCommand(cmd) {
    console.log(`发送设备命令:`, cmd);
    
    // 构建适合WebSocket发送的命令格式
    const wsCommand = {
      id: cmd.deviceId,
      type: cmd.deviceType,
      action: cmd.action,
      parameters: cmd.parameters || {}
    };
    
    // 发送命令给WebSocket
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error(`命令执行超时: ${cmd.deviceType} ${cmd.deviceId} ${cmd.action}`));
      }, 30000); // 30秒超时
      
      // 创建一次性的消息监听器
      // 🔧 使用优化的WebSocket管理器处理命令响应
      let responseHandler = (data) => {
        if (data.type === 'commandResult' && data.data) {
          const result = data.data;
          if (result.command && result.command.id === cmd.deviceId && result.command.action === cmd.action) {
            clearTimeout(timeout);
            topControlWsManager.removeMessageHandler('commandResult', responseHandler);
            
            if (result.success) {
              console.log(`命令执行成功:`, result);
              resolve(result);
            } else {
              console.error(`命令执行失败:`, result);
              reject(new Error(result.error || '命令执行失败'));
            }
          }
        }
      };
      
      // 添加临时消息监听
      topControlWsManager.addMessageHandler('commandResult', responseHandler);
      
      // 发送WebSocket消息（使用 deviceControl 单命令协议）
      const success = sendWsMessage({
        type: 'deviceControl',
        payload: {
          deviceId: cmd.deviceId,
          deviceType: cmd.deviceType,
          action: cmd.action,
          parameters: cmd.parameters || {}
        }
      });
      
      if (!success) {
        clearTimeout(timeout);
        topControlWsManager.removeMessageHandler('commandResult', responseHandler);
        reject(new Error('WebSocket消息发送失败'));
      }
    });
  },
  
  async checkConditions(conditions) {
    const conditionPromises = conditions.map(async condition => {
      switch(condition.type) {
        case 'deviceStatus':
          return this.checkDeviceStatusCondition(condition);
        
        case 'timeout':
          return this.checkTimeoutCondition(condition);
          
        case 'deviceParameter': // 新增：设备参数条件类型
          return this.checkDeviceParameterCondition(condition);
          
        case 'sensorValue':
          return this.checkSensorValueCondition(condition);
          
        default:
          throw new Error(`未知的条件类型: ${condition.type}`);
      }
    });
    // 等待所有条件满足
    await Promise.all(conditionPromises);
  },

  
  async checkDeviceStatusCondition(condition) {
    console.log(`检查设备状态条件:`, condition);
    
    const startTime = Date.now();
    const timeoutMs = (condition.timeout || 60) * 1000; // 默认60秒超时
    
    while(this.status === 'running') {
      // 检查是否超时
      if(Date.now() - startTime > timeoutMs) {
        throw new Error(`等待设备 ${condition.deviceId} 状态 ${condition.status} 超时`);
      }
      
      // 获取设备当前状态
      const device = globalDevices.value.get(condition.deviceId);
      
      if(device && device.status === condition.status) {
        console.log(`条件满足: 设备 ${condition.deviceId} 状态为 ${condition.status}`);
        return true;
      }
      
      // 每秒检查一次
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 如果状态变为暂停或停止，中断检查
      if(this.status !== 'running') {
        throw new Error('流程已暂停或终止');
      }
    }
  },
  // 检查设备参数条件 - 优化版3.0
  async checkDeviceParameterCondition(condition, conditionIndex) {
    console.log(`检查设备参数条件:`, condition);
    
    const startTime = Date.now();
    const timeoutMs = (condition.timeout || 60) * 1000;
    
    // 获取目标参数的描述，用于日志和UI显示
    const paramName = condition.parameter;
    const paramDisplayName = this.getParameterDisplayName(condition.deviceType, paramName);
    const deviceTypeName = this.getDeviceTypeName(condition.deviceType);
    const comparisonText = this.getComparisonText(condition.comparison);
    const targetValue = condition.value;
    const tolerance = condition.tolerance || 
      (paramName === 'currentTemp' || paramName === 'temperature' ? 2 : // 温度2度容差
       paramName === 'position' ? 10 : // 位置10单位容差
       paramName === 'flowRate' ? 0.2 : // 流速0.2ml/min容差
       0.05 * targetValue); // 默认5%容差
    
    // 记录初始值，用于计算进度
    let initialValue = null;
    const device = globalDevices.value.get(condition.deviceId);
    if (device) {
      initialValue = device[condition.parameter];
      console.log(`设备${condition.deviceId}的${paramDisplayName}初始值: ${initialValue}, 目标值: ${targetValue}`);
    }
    
    // 动态调整稳定计数器 - 不同参数类型需要不同的稳定性要求
    const requiredStabilityCount = 
      (paramName === 'currentTemp' || paramName === 'temperature') ? 5 : // 温度需要更多稳定检查
      (paramName === 'position') ? 3 : // 位置需要中等稳定检查
      (paramName === 'flowRate') ? 4 : // 流速需要较多稳定检查
      2; // 其他参数2次稳定即可
    
    console.log(`设备${condition.deviceId}参数${paramDisplayName}需要连续${requiredStabilityCount}次稳定才算满足条件`);
    
    // 稳定计数器
    let stabilityCounter = 0;
    
    // 显示开始等待的提示
    ElMessage.info(`等待${deviceTypeName}(${condition.deviceId})的${paramDisplayName}${comparisonText}${targetValue}...`);
    
    // 记录最后一次值，用于检测停滞
    let lastValue = null;
    let stagnantCounter = 0;
    
    // 检测最大进展值，避免倒退
    let maxProgress = 0;
    
    while(this.status === 'running') {
      // 计算进度百分比 - 时间型进度
      const elapsedTime = Date.now() - startTime;
      const timeProgressPercent = Math.min(Math.round((elapsedTime / timeoutMs) * 100), 99);
      
      // 检查是否超时
      if(elapsedTime > timeoutMs) {
        // 更新UI显示为超时状态
        if (conditionIndex !== undefined) {
          this.updateWaitingCondition(conditionIndex, 100, true);
        }
        
        const errorMsg = `等待设备 ${condition.deviceId} 的${paramDisplayName}达到目标值(${targetValue})超时`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // 获取设备当前参数值
      const device = globalDevices.value.get(condition.deviceId);
      
      if(device) {
        const currentValue = device[condition.parameter];
        
        // 如果还没有初始值记录，现在记录
        if (initialValue === null) {
          initialValue = currentValue;
          console.log(`记录初始值: ${initialValue}`);
        }
        
        // 检查是否停滞（值没有变化）
        if (lastValue !== null && currentValue === lastValue) {
          stagnantCounter++;
          // 如果值超过10次检查没有变化（约5秒），输出警告
          if (stagnantCounter >= 10 && stagnantCounter % 10 === 0) {
            console.warn(`警告: 设备${condition.deviceId}的${paramDisplayName}已停滞在${currentValue}超过${stagnantCounter/2}秒`);
          }
        } else {
          stagnantCounter = 0;
          lastValue = currentValue;
        }
        
        let conditionMet = false;
        
        // 根据比较类型检查条件
        switch(condition.comparison) {
          case 'eq': // 等于
            // 带容差的相等判断
            conditionMet = Math.abs(currentValue - condition.value) <= tolerance;
            break;
            
          case 'gt': // 大于
            conditionMet = currentValue > condition.value;
            break;
            
          case 'lt': // 小于
            conditionMet = currentValue < condition.value;
            break;
            
          case 'gte': // 大于等于
            conditionMet = currentValue >= condition.value;
            break;
            
          case 'lte': // 小于等于
            conditionMet = currentValue <= condition.value;
            break;
            
          case 'approx': // 近似值（主要用于浮点数）
            conditionMet = Math.abs(currentValue - condition.value) <= tolerance;
            break;
        }
        
        // 根据条件是否满足调整稳定计数器
        if(conditionMet) {
          stabilityCounter++;
          
          // 计算基于接近目标值的进度 - 达到稳定次数的百分比
          const valueProgressPercent = Math.min(Math.round((stabilityCounter / requiredStabilityCount) * 100), 99);
          
          // 取两种进度的最大值，确保进度一直在前进
          let combinedProgress = Math.max(timeProgressPercent, valueProgressPercent);
          
          // 确保进度不会倒退
          combinedProgress = Math.max(combinedProgress, maxProgress);
          maxProgress = combinedProgress;
          
          // 更新等待条件状态 - 显示更积极的进度
          if (conditionIndex !== undefined) {
            this.updateWaitingCondition(conditionIndex, combinedProgress);
          }
          
          // 如果已经连续多次满足条件，认为条件稳定满足
          if(stabilityCounter >= requiredStabilityCount) {
            // 条件满足时，设置进度为100%
            if (conditionIndex !== undefined) {
              this.updateWaitingCondition(conditionIndex, 100);
            }
            
            console.log(`条件已稳定满足: ${deviceTypeName}(${condition.deviceId})的${paramDisplayName}已${comparisonText}${targetValue}`);
            // 记录最终值和达成时间
            const reachedInSec = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`目标值: ${targetValue}, 当前值: ${currentValue}, 容差: ±${tolerance}, 耗时: ${reachedInSec}秒`);
            
            // 直接跳出循环，提前满足条件
            return true;
          }
          
          console.log(`接近条件满足(${stabilityCounter}/${requiredStabilityCount}): 当前值: ${currentValue}, 目标值: ${targetValue}, 容差: ±${tolerance}`);
        } else {
          // 如果条件不满足，重置稳定计数器
          stabilityCounter = 0;
          
          // 对于可测量的进度（如温度、位置变化），计算完成百分比
          let valueProgress = 0;
          
          if (initialValue !== null && initialValue !== currentValue) {
            // 根据不同参数类型计算进度
            if (paramName === 'temperature' || paramName === 'currentTemp') {
              // 温度变化进度
              const direction = targetValue > initialValue ? 1 : -1; // 是加热还是冷却
              if (direction > 0) { // 加热
                valueProgress = Math.min(90, Math.max(0, 
                  Math.round((currentValue - initialValue) / (targetValue - initialValue) * 100)
                ));
              } else { // 冷却
                valueProgress = Math.min(90, Math.max(0, 
                  Math.round((initialValue - currentValue) / (initialValue - targetValue) * 100)
                ));
              }
            } else if (paramName === 'position') {
              // 位置移动进度
              const direction = targetValue > initialValue ? 1 : -1;
              const totalDistance = Math.abs(targetValue - initialValue);
              const currentDistance = Math.abs(currentValue - initialValue);
              
              valueProgress = Math.min(90, Math.max(0, 
                Math.round((currentDistance / totalDistance) * 100)
              ));
            } else if (paramName === 'flowRate') {
              // 流速变化进度
              const direction = targetValue > initialValue ? 1 : -1;
              const totalChange = Math.abs(targetValue - initialValue);
              const currentChange = Math.abs(currentValue - initialValue);
              
              valueProgress = Math.min(90, Math.max(0, 
                Math.round((currentChange / totalChange) * 100)
              ));
            } else {
              // 其他参数的通用进度计算
              const totalChange = Math.abs(targetValue - initialValue);
              const currentChange = Math.abs(currentValue - initialValue);
              
              if (totalChange > 0) {
                valueProgress = Math.min(90, Math.max(0, 
                  Math.round((currentChange / totalChange) * 100)
                ));
              }
            }
          }
          
          // 取两种进度的最大值
          let combinedProgress = Math.max(timeProgressPercent, valueProgress);
          
          // 确保进度不会倒退
          combinedProgress = Math.max(combinedProgress, maxProgress);
          maxProgress = combinedProgress;
          
          // 更新等待条件状态
          if (conditionIndex !== undefined) {
            this.updateWaitingCondition(conditionIndex, combinedProgress);
          }
        }
        
        // 记录进度 - 但降低日志频率
        const progressTime = ((Date.now() - startTime) / 1000).toFixed(1);
        if (parseInt(progressTime) % 5 === 0) { // 每5秒记录一次
          console.log(`等待进度: ${maxProgress}%, 当前值: ${currentValue}, 目标值: ${targetValue}, 已等待${progressTime}秒`);
        }
      } else {
        console.warn(`找不到设备 ${condition.deviceId} 的数据，请检查设备是否连接`);
      }
      
      // 等待检查间隔 - 根据不同设备参数类型调整
      const checkInterval = 
        (paramName === 'currentTemp' || paramName === 'temperature') ? 1000 : // 温度1秒检查一次
        (paramName === 'position') ? 500 : // 位置0.5秒检查一次
        (paramName === 'flowRate') ? 750 : // 流速0.75秒检查一次
        300; // 其他参数0.3秒检查一次
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
      // 如果状态变为暂停或停止，中断检查
      if(this.status !== 'running') {
        throw new Error('流程已暂停或终止');
      }
    }
  },
  
  // 获取参数的友好显示名称
  getParameterDisplayName(deviceType, parameter) {
    const displayNames = {
      'position': '位置',
      'speed': '速度',
      'currentTemp': '温度',
      'temperature': '温度',
      'flowRate': '流速',
      'intensity': '光强',
      'port': '端口',
      'aspiratePort': '吸取端口',
      'dispensePort': '输送端口'
    };
    
    return displayNames[parameter] || parameter;
  },
  
  // 获取设备类型的友好名称
  getDeviceTypeName(deviceType) {
    const displayNames = {
      'pump': '泵',
      'valve': '阀门',
      'chip': '加热芯片',
      'mfc': '流量控制器',
      'light': '光照控制'
    };
    
    return displayNames[deviceType] || deviceType;
  },
  
  // 获取比较符号的文本表示
  getComparisonText(comparison) {
    const displayTexts = {
      'eq': '等于',
      'gt': '大于',
      'lt': '小于',
      'gte': '大于等于',
      'lte': '小于等于',
      'approx': '约等于'
    };
    
    return displayTexts[comparison] || comparison;
  },
  async checkTimeoutCondition(condition) {
    console.log(`执行等待条件: ${condition.duration}秒`);
    
    const durationMs = condition.duration * 1000;
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    
    // 创建一个等待条件用于UI显示
    const waitingCondition = {
      type: 'timeout',
      description: `等待${condition.duration}秒`,
      progress: 0,
      timeout: false
    };
    
    // 添加到等待条件列表以显示在UI上
    const conditionIndex = this.waitingConditions.length;
    this.waitingConditions.push(waitingCondition);
    
    // 记录实际等待的时间
    let actualWaitTime = 0;
    
    while(Date.now() < endTime && this.status === 'running') {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const remainingTime = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
      
      // 计算进度百分比
      const progressPercent = Math.min(99, Math.round((elapsedTime / durationMs) * 100));
      
      // 更新等待条件状态
      waitingCondition.progress = progressPercent;
      waitingCondition.description = `等待中: 剩余${remainingTime}秒`;
      this.waitingConditions[conditionIndex] = { ...waitingCondition };
      
      // 每整秒记录一次
      if (Math.floor(elapsedTime / 1000) > actualWaitTime) {
        actualWaitTime = Math.floor(elapsedTime / 1000);
        if (actualWaitTime % 5 === 0 || actualWaitTime === 1) { // 每5秒或第1秒记录
          console.log(`等待进度: ${progressPercent}%, 已等待${actualWaitTime}秒, 剩余${remainingTime}秒`);
        }
      }
      
      // 每100ms检查一次状态
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 如果状态变为暂停，等待恢复
      if(this.status === 'paused') {
        const pauseStartTime = Date.now();
        waitingCondition.description = `等待已暂停: 剩余${remainingTime}秒`;
        this.waitingConditions[conditionIndex] = { ...waitingCondition };
        
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if(this.status === 'running') {
              clearInterval(checkInterval);
              // 调整结束时间以考虑暂停的时间
              const pauseDuration = Date.now() - pauseStartTime;
              endTime.value += pauseDuration;
              resolve();
            } else if(this.status === 'idle') {
              clearInterval(checkInterval);
              throw new Error('流程已终止');
            }
          }, 200);
        });
      }
      
      // 如果状态变为停止，中断等待
      if(this.status === 'idle') {
        throw new Error('流程已终止');
      }
    }
    
    // 完成等待
    waitingCondition.progress = 100;
    waitingCondition.description = `等待完成: ${condition.duration}秒`;
    this.waitingConditions[conditionIndex] = { ...waitingCondition };
    
    console.log(`等待条件满足: 完成${condition.duration}秒等待`);
    return true;
  },
  
  // 执行时间延迟 - 增强版，支持暂停和终止
  async executeDelay(seconds) {
    console.log(`执行延迟: ${seconds}秒`);
    
    const durationMs = seconds * 1000;
    const startTime = Date.now();
    let endTime = startTime + durationMs;
    
    // 创建一个延迟条件用于UI显示
    const delayCondition = {
      type: 'delay',
      description: `系统稳定: ${seconds}秒`,
      progress: 0,
      timeout: false
    };
    
    // 添加到等待条件列表
    this.waitingConditions = [delayCondition];
    
    // 记录实际等待的时间
    let actualWaitTime = 0;
    
    while(Date.now() < endTime && this.status === 'running') {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const remainingTime = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
      
      // 计算进度百分比
      const progressPercent = Math.min(99, Math.round((elapsedTime / durationMs) * 100));
      
      // 更新等待条件状态
      delayCondition.progress = progressPercent;
      delayCondition.description = `系统稳定中: 剩余${remainingTime}秒`;
      this.waitingConditions[0] = { ...delayCondition };
      
      // 每整秒记录一次
      if (Math.floor(elapsedTime / 1000) > actualWaitTime) {
        actualWaitTime = Math.floor(elapsedTime / 1000);
        if (actualWaitTime % 5 === 0 || actualWaitTime === 1) { // 每5秒或第1秒记录
          console.log(`延迟进度: ${progressPercent}%, 已延迟${actualWaitTime}秒, 剩余${remainingTime}秒`);
        }
      }
      
      // 每100ms检查一次状态
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 如果状态变为暂停，等待恢复
      if(this.status === 'paused') {
        const pauseStartTime = Date.now();
        delayCondition.description = `延迟已暂停: 剩余${remainingTime}秒`;
        this.waitingConditions[0] = { ...delayCondition };
        
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if(this.status === 'running') {
              clearInterval(checkInterval);
              // 调整结束时间以考虑暂停的时间
              const pauseDuration = Date.now() - pauseStartTime;
              endTime += pauseDuration;
              resolve();
            } else if(this.status === 'idle') {
              clearInterval(checkInterval);
              throw new Error('流程已终止');
            }
          }, 200);
        });
      }
      
      // 如果状态变为停止，中断等待
      if(this.status === 'idle') {
        throw new Error('流程已终止');
      }
    }
    
    // 完成延迟
    delayCondition.progress = 100;
    delayCondition.description = `延迟完成: ${seconds}秒`;
    this.waitingConditions[0] = { ...delayCondition };
    
    // 清空等待条件列表
    setTimeout(() => {
      this.waitingConditions = [];
    }, 500);
    
    console.log(`延迟完成: ${seconds}秒`);
  },
  
  async checkSensorValueCondition(condition) {
    console.log(`检查传感器值条件:`, condition);
    
    const startTime = Date.now();
    const timeoutMs = (condition.timeout || 60) * 1000; // 默认60秒超时
    
    while(this.status === 'running') {
      // 检查是否超时
      if(Date.now() - startTime > timeoutMs) {
        throw new Error(`等待传感器 ${condition.sensorId} 条件满足超时`);
      }
      
      // TODO: 获取传感器实时数据，可以通过WebSocket或API实现
      // 这里使用模拟值
      const sensorValue = await getSensorValue(condition.sensorId);
      
      // 根据比较类型检查条件
      let conditionMet = false;
      switch(condition.comparison) {
        case 'gt':
          conditionMet = sensorValue > condition.value;
          break;
        case 'lt':
          conditionMet = sensorValue < condition.value;
          break;
        case 'eq':
          conditionMet = Math.abs(sensorValue - condition.value) < 0.001; // 浮点数比较
          break;
        case 'gte':
          conditionMet = sensorValue >= condition.value;
          break;
        case 'lte':
          conditionMet = sensorValue <= condition.value;
          break;
      }
      
      if(conditionMet) {
        console.log(`条件满足: 传感器 ${condition.sensorId} 值 ${sensorValue} ${condition.comparison} ${condition.value}`);
        return true;
      }
      
      // 每秒检查一次
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 如果状态变为暂停或停止，中断检查
      if(this.status !== 'running') {
        throw new Error('流程已暂停或终止');
      }
    }
  },
  
  pauseWorkflow() {
    if(this.status === 'running') {
      this.status = 'paused';
      console.log('流程已暂停');
    }
  },
  
  resumeWorkflow() {
    if(this.status === 'paused') {
      this.status = 'running';
      console.log('流程已恢复');
    }
  },
  
  stopWorkflow() {
    this.status = 'idle';
    console.log('流程已终止');
  },

  // 从设备命令自动生成完成条件 - 增强版2.0
  generateCompletionConditions(deviceCommands) {
    const conditions = [];
    
    // 对命令进行优先级排序 - 某些命令的执行需要优先检查
    const prioritizedCommands = [...deviceCommands].sort((a, b) => {
      // 加热器设置温度的命令具有较高优先级，因为温度变化通常最慢
      if (a.deviceType === 'chip' && a.action === 'setTemp') return -1;
      if (b.deviceType === 'chip' && b.action === 'setTemp') return 1;
      
      // 泵设置位置的命令其次
      if (a.deviceType === 'pump' && a.action === 'setPosition') return -1;
      if (b.deviceType === 'pump' && b.action === 'setPosition') return 1;
      
      return 0; // 其他命令维持原顺序
    });
    
    // 为每个命令生成完成条件
    prioritizedCommands.forEach(cmd => {
      // 首先检查命令是否需要生成完成条件
      if (cmd.generateCompletionCondition === false) {
        console.log(`命令 ${cmd.deviceId}-${cmd.action} 已禁用自动生成完成条件`);
        return; // 跳过此命令
      }
      
      // 设置默认超时时间，如果命令中指定了则使用指定值
      const defaultTimeout = cmd.completionTimeout || 60;
      
      // 获取当前设备数据以供参考
      const device = globalDevices.value.get(cmd.deviceId);
      
      // 根据不同设备类型和命令生成不同的完成条件
      switch(cmd.deviceType) {
        case 'pump':
          if(cmd.action === 'setPosition' && cmd.parameters?.position !== undefined) {
            // 统一的位置设置 - 简化版本
            conditions.push({
              type: 'deviceParameter',
              deviceType: 'pump',
              deviceId: cmd.deviceId,
              parameter: 'position',
              comparison: 'approx',
              value: cmd.parameters.position,
              tolerance: 10, // 允许10单位的误差
              timeout: defaultTimeout
            });
          } else if(cmd.action === 'setSpeed') {
            // 设置速度 - 监控速度是否已设置
            conditions.push({
              type: 'deviceParameter',
              deviceType: 'pump',
              deviceId: cmd.deviceId,
              parameter: 'speed',
              comparison: 'eq',
              value: cmd.parameters.speed,
              tolerance: 1, // 允许1%的误差
              timeout: 5 // 速度设置应该很快
            });
          } else if(cmd.action === 'setPort') {
            // 设置端口 - 监控端口是否已设置
            conditions.push({
              type: 'deviceParameter',
              deviceType: 'pump',
              deviceId: cmd.deviceId,
              parameter: 'port',
              comparison: 'eq',
              value: cmd.parameters.port,
              tolerance: 0,
              timeout: 10 // 端口设置应该很快
            });
          } else if(cmd.action === 'stop') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'pump',
              deviceId: cmd.deviceId,
              status: 'stopped',
              timeout: 5 // 停止应该很快
            });
          }
          break;
          
        case 'chip':
          if(cmd.action === 'setTemp' && cmd.parameters?.temperature !== undefined) {
            conditions.push({
              type: 'deviceParameter',
              deviceType: 'chip',
              deviceId: cmd.deviceId,
              parameter: 'currentTemp',
              comparison: 'approx', // 使用更精确的近似比较
              value: cmd.parameters.temperature,
              tolerance: 2, // 允许2度的误差
              timeout: Math.max(120, defaultTimeout) // 加热需要较长时间，至少120秒
            });
          } else if(cmd.action === 'powerOn') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'chip',
              deviceId: cmd.deviceId,
              status: 'heating',
              timeout: 10
            });
          } else if(cmd.action === 'powerOff') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'chip',
              deviceId: cmd.deviceId,
              status: 'idle',
              timeout: 10
            });
          }
          break;
          
        case 'valve':
          if(cmd.action === 'setPosition' && cmd.parameters?.position !== undefined) {
            conditions.push({
              type: 'deviceParameter',
              deviceType: 'valve',
              deviceId: cmd.deviceId,
              parameter: 'position',
              comparison: 'eq',
              value: cmd.parameters.position,
              timeout: defaultTimeout
            });
          } else if(cmd.action === 'open') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'valve',
              deviceId: cmd.deviceId,
              status: 'open',
              timeout: defaultTimeout
            });
          } else if(cmd.action === 'close') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'valve',
              deviceId: cmd.deviceId,
              status: 'closed',
              timeout: defaultTimeout
            });
          }
          break;
          
        case 'mfc':
          if(cmd.action === 'setFlowRate' && cmd.parameters?.flowRate !== undefined) {
            conditions.push({
              type: 'deviceParameter',
              deviceType: 'mfc',
              deviceId: cmd.deviceId,
              parameter: 'flowRate',
              comparison: 'approx',
              value: cmd.parameters.flowRate,
              tolerance: 0.2, // 允许0.2ml/min误差
              timeout: defaultTimeout
            });
          } else if(cmd.action === 'start') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'mfc',
              deviceId: cmd.deviceId,
              status: 'running',
              timeout: 10
            });
          } else if(cmd.action === 'stop') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'mfc',
              deviceId: cmd.deviceId,
              status: 'stopped',
              timeout: 10
            });
          }
          break;
          
        case 'light':
          if(cmd.action === 'setIntensity' && cmd.parameters?.intensity !== undefined) {
            conditions.push({
              type: 'deviceParameter',
              deviceType: 'light',
              deviceId: cmd.deviceId,
              parameter: 'intensity',
              comparison: 'approx',
              value: cmd.parameters.intensity,
              tolerance: 1, // 允许1%的误差
              timeout: defaultTimeout
            });
          } else if(cmd.action === 'on') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'light',
              deviceId: cmd.deviceId,
              status: 'on',
              timeout: 5
            });
          } else if(cmd.action === 'off') {
            conditions.push({
              type: 'deviceStatus',
              deviceType: 'light',
              deviceId: cmd.deviceId,
              status: 'off',
              timeout: 5
            });
          }
          break;
      }
    });
    
    // 记录生成的完成条件
    console.log(`为${deviceCommands.length}个命令生成了${conditions.length}个完成条件`);
    conditions.forEach((condition, index) => {
      console.log(`条件${index+1}:`, JSON.stringify(condition));
    });
    
    return conditions;
  }
});

// 从文件加载硬件结构
const loadStructureFromFile = async (path) => {
  try {
    isLoading.value = true;
    console.log("尝试加载硬件结构:", path);
    
    // 🎯 保存编辑模式状态，防止在重新初始化图表时丢失
    const savedEditMode = isEditMode.value;
    const savedEditTaskData = editTaskData.value;
    const savedReactionPaths = [...reactionPaths.value];
    const savedSelectedIndex = selectedReactionPathIndex.value;
    
    console.log('🔒 保存编辑状态 - 编辑模式:', savedEditMode);
    console.log('🔒 保存编辑状态 - 反应路径数量:', savedReactionPaths.length);
    console.log('🔒 保存编辑状态 - 编辑数据:', savedEditTaskData);
    
    let baseUrl = '';
    if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:3000'; // 开发环境下的后端地址
    }
    
    // 1. 首先尝试从新的API路径获取文件内容
    const pathId = path.id || path.name; // 使用ID优先，否则使用name
    console.log("正在从API加载路径ID:", pathId);
    
    try {
      const response = await axios.get(`${baseUrl}/chem-api/devices/path/${encodeURIComponent(pathId)}`);
      
      if (response.data.code !== 0 || !response.data.data) {
        throw new Error("API返回错误或数据为空");
      }
      
      const pathConfig = response.data.data;
      console.log("从API加载的路径数据:", pathConfig);
      
      // 确保图表已初始化
      if (!graph) {
        console.error("图表实例未初始化，无法加载路径");
        errorMessage.value = "图表实例未初始化，请刷新页面重试";
        return;
      }
      
      // 重新初始化图表以解决潜在的渲染问题
      // 1. 获取容器尺寸
      const containerEl = container.value;
      if (!containerEl) {
        errorMessage.value = "找不到图表容器";
        return;
      }
      
      const graphWidth = containerEl.clientWidth || 800;
      const graphHeight = containerEl.clientHeight || 600;
      
      // 2. 销毁旧图表
      if (graph) {
        graph.destroy();
      }
      
      // 3. 创建新图表
      console.log(`重新初始化图形，尺寸: ${graphWidth}x${graphHeight}`);
      graph = new Graph({
        container: containerEl,
        width: graphWidth,
        height: graphHeight,
        behaviors: [
          
          {
            type: 'zoom-canvas',
            sensitivity: 1.5,
            key: 'zoom-canvas',
            enable: true
          },
          {
            type: 'click-select',
            key: 'click-select',
            enable: true
          },
        ],
        node: {
          style: {
            fill: '#91d5ff',
            stroke: '#40a9ff',
            lineWidth: 1,
            radius: 6,
            cursor: 'move'
          }
        },
        edge: {
          style: {
            stroke: '#91d5ff',
            lineWidth: 2,
            endArrow: {
              fill: '#91d5ff',
              stroke: '#91d5ff'
            }
          }
        }
      });
      
      // 重新注册事件
      graph.on('node:click', handleDeviceClick);
      
      // 处理和添加节点
      const nodesData = [];
      if (pathConfig.data && pathConfig.data.nodes && Array.isArray(pathConfig.data.nodes)) {
        for (const node of pathConfig.data.nodes) {
          if (!node.id) continue;
          
          // 创建标准节点数据
          const processedNode = {
            id: node.id,
            type: "image",
            data: {
              deviceType: node.data?.deviceType || node.id.split('-')[0] || 'unknown',
              label: node.data?.label || "设备"
            },
            style: {
              x: node.style?.x || 100 + Math.random() * 300,
              y: node.style?.y || 100 + Math.random() * 200,
              size: node.style?.size || [40, 40],
              label: node.style?.label || `设备 (${node.id})`,
              labelCfg: {
                position: "bottom",
                offset: [0, 5],
                style: {
                  fill: "#333",
                  fontSize: 12
                }
              }
            }
          };
          
          // 设置图标
          const deviceType = processedNode.data.deviceType;
          switch (deviceType) {
            case "pump": 
              processedNode.style.src = pump; // 使用JPG图片
              processedNode.style.label = node.style?.label || `泵 (${node.id})`;
              // 针对JPG格式图片调整尺寸，确保正确显示
              processedNode.style.size = [40, 40];
              break;
            case "valve": 
              processedNode.style.src = valve; // 使用JPG图片
              processedNode.style.label = node.style?.label || `阀 (${node.id})`;
              processedNode.style.size = [40, 40];
              break;
            case "chip": 
              processedNode.style.src = chip; // 使用JPG图片
              processedNode.style.label = node.style?.label || `加热芯片 (${node.id})`;
              processedNode.style.size = [40, 40];
              break;
            case "mfc": 
              processedNode.style.src = mfc; 
              processedNode.style.label = node.style?.label || `MFC控制器 (${node.id})`;
              break;
            case "light": 
              processedNode.style.src = light; 
              processedNode.style.label = node.style?.label || `光照控制 (${node.id})`;
              break;
            case "bottle": 
              processedNode.style.src = bottle; // 使用JPG图片
              processedNode.style.label = node.style?.label || `瓶 (${node.id})`;
              processedNode.style.size = [40, 40];
              break;
            default:
              // 如果没有匹配的图标，使用通用图标
              processedNode.style.src = bottle;
          }
          
          nodesData.push(processedNode);
        }
      }
      
      console.log("处理后的节点数据:", nodesData);
      
      // 添加节点到图表
      if (nodesData.length > 0) {
        graph.addNodeData(nodesData);
      } else {
        console.warn("没有有效的节点数据");
      }
      
      // 处理和添加边
      const edgesData = [];
      if (pathConfig.data && pathConfig.data.edges && Array.isArray(pathConfig.data.edges)) {
        for (const edge of pathConfig.data.edges) {
          if (!edge.source || !edge.target) continue;
          
          // 创建标准边数据
          const processedEdge = {
            id: edge.id || `edge-${Math.random().toString(36).substr(2, 9)}`,
            source: edge.source,
            target: edge.target,
            style: {
              stroke: '#91d5ff',
              lineWidth: 2,
              endArrow: {
                fill: '#91d5ff',
                stroke: '#91d5ff'
              }
            }
          };
          
          // 复制其他属性
          if (edge.style) {
            Object.assign(processedEdge.style, edge.style);
          }
          
          edgesData.push(processedEdge);
        }
      }
      
      console.log("处理后的边数据:", edgesData);
      
      // 添加边到图表
      if (edgesData.length > 0) {
        graph.addEdgeData(edgesData);
      }
      
            // 🎯 先恢复编辑模式状态，再渲染图表
      if (savedEditMode) {
        console.log('🔓 恢复编辑状态');
        isEditMode.value = savedEditMode;
        editTaskData.value = savedEditTaskData;
        
        // 恢复反应路径数据
        if (savedReactionPaths.length > 0) {
          reactionPaths.value = savedReactionPaths;
          selectedReactionPathIndex.value = savedSelectedIndex;
          console.log('✅ 已恢复反应路径数据，数量:', reactionPaths.value.length);
        } else if (editTaskData.value) {
          // 如果没有保存的反应路径，从task数据重新创建
          const taskReactionPath = createReactionPathFromTaskData(editTaskData.value);
          if (taskReactionPath) {
            reactionPaths.value = [taskReactionPath];
            selectedReactionPathIndex.value = 0;
            console.log('✅ 从task数据重新创建反应路径', taskReactionPath);
          }
        }
        
        // 确保反应路径面板显示
        isShowingReactionPath.value = true;
        
        console.log('✅ 编辑模式状态已恢复');
        console.log('✅ 编辑任务数据:', editTaskData.value);
        console.log('✅ 当前编辑模式状态:', isEditMode.value);
        console.log('✅ 反应路径数量:', reactionPaths.value.length);
      }
      
      // 渲染图表
      try {
        console.log("开始渲染图表...");
        
        // 延迟渲染，等待DOM更新
        setTimeout(() => {
          graph.render();
          console.log("图表渲染完成");
          
          // 自动调整视图以适应所有元素
          if (nodesData.length > 0) {
            graph.fitView();
          }
          
          // 硬件图加载完成，初始化反应路径
          onGraphLoaded();
          
          // 🎯 在图表渲染完成后，再次确认编辑状态
          if (savedEditMode) {
            console.log('🔄 图表渲染完成后确认编辑状态');
            console.log('🔄 当前编辑模式:', isEditMode.value);
            console.log('🔄 反应路径数量:', reactionPaths.value.length);
          }
        }, 100);
      } catch (renderError) {
        console.error("图表渲染失败:", renderError);
        errorMessage.value = `图表渲染失败: ${renderError.message}`;
      }
      
      // 🎯 立即调用硬件结构加载完成处理，此时编辑状态已恢复
      onHardwareStructureLoaded();
      // 更新当前选中的路径
      selectedPath.value = path;
      
      // 设置控制器索引
      if (pathConfig.controllerIndex !== undefined) {
        selectedControllerIndex.value = pathConfig.controllerIndex;
      }
    } catch (apiError) {
      console.error("从API加载路径失败:", apiError);
      errorMessage.value = `加载路径失败: ${apiError.message}`;
    }
  } catch (error) {
    console.error("加载硬件结构失败:", error);
    errorMessage.value = `加载硬件结构失败: ${error.message}`;
  } finally {
    isLoading.value = false;
  }
};


// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 向图中添加设备节点
const addDeviceToGraph = (device, iconSrc, label, x, y) => {
  if (!graph) {
    console.error("添加设备失败：图表未初始化");
    return;
  }
  
  console.log("添加设备到图中:", device, "位置:", x, y, "图标:", iconSrc);
  
  try {
    // 检查节点是否已存在
    const existingNode = graph.getNodeData().find(node => node.id === device.id);
    if (existingNode) {
      console.log(`节点 ${device.id} 已存在于图中，不重复添加`);
      
      // 更新节点外观以反映状态
      updateNodeAppearance(device.id, device.status);
      return;
    }
    
    // 要添加的节点数据
    const nodeData = {
      id: device.id,
      type: "image",
      data: {
        label: label,
        deviceType: device.type,
        nodeType: device.type,
        deviceData: device,
        // 记录图片格式信息
        imgFormat: ['pump', 'valve', 'chip', 'bottle'].includes(device.type) ? 'jpg' : 'svg'
      },
      style: {
        src: iconSrc,
        x: x,
        y: y,
        // 调整图片尺寸，确保JPG图片显示正确
        size: ['pump', 'valve', 'chip', 'bottle'].includes(device.type) ? [40, 40] : [40, 40],
        label: device.moduleMetadata 
          ? `${label} (${device.moduleMetadata.moduleName} #${device.moduleMetadata.moduleId})` 
          : `${label} (${device.id})`,
        labelCfg: {
          position: "bottom",
          offset: [0, 5],
          style: {
            fill: "#333",
            fontSize: 12
          }
        },
        cursor: "move",
        // 节点外观
        fill: "rgba(255, 255, 255, 0.9)",
        stroke: "#1890ff",
        lineWidth: 1,
        radius: 6,
        shadowColor: "rgba(0,0,0,0.1)",
        shadowBlur: 5
      }
    };
    
    // 打印完整节点数据用于调试
    console.log("添加节点详细数据:", JSON.stringify(nodeData, null, 2));
    // 添加节点
    graph.addNodeData([nodeData]);
    
    
    
    // 更新节点外观以反映状态
    updateNodeAppearance(device.id, device.status);
    
    // 确保渲染更新 - 这是关键步骤
    graph.render();
    
    console.log("节点添加成功，已渲染");
  } catch (error) {
    console.error("添加设备到图中失败:", error);
    errorMessage.value = `添加设备到图中失败: ${error.message}`;
  }
};

// 从后端获取设备信息
const fetchDeviceInfo = async (deviceId) => {
  if (!deviceId) {
    console.warn("无效的设备ID");
    return null;
  }
  
  console.log("获取设备信息:", deviceId);
  
  try {
    // 尝试从缓存获取设备类型
    let deviceType = null;
    
    // 从设备ID推断类型
    if (deviceId.includes("pump")) {
      deviceType = "pump";
    } else if (deviceId.includes("valve")) {
      deviceType = "valve";
    } else if (deviceId.includes("chip")) {
      deviceType = "chip";
    } else if (deviceId.includes("mfc")) {
      deviceType = "mfc";
    } else if (deviceId.includes("light")) {
      deviceType = "light";
    }
    
    // 首先尝试通过WebSocket获取设备信息
    if (wsConnected.value) {
      console.log("尝试通过WebSocket获取设备信息");
      const deviceInfoPromise = new Promise((resolve, reject) => {
        // 设置超时
        const timeout = setTimeout(() => {
          console.warn("WebSocket获取设备信息超时");
          resolve(null); // 超时时返回null
        }, 3000);
        
        // 🔧 创建设备信息响应处理器
        let deviceInfoHandler = (data) => {
          console.log("收到WebSocket消息:", data);
          if (data.type === 'deviceInfo' && data.data && data.data.id === deviceId) {
            clearTimeout(timeout);
            topControlWsManager.removeMessageHandler('deviceInfo', deviceInfoHandler);
            topControlWsManager.removeMessageHandler('error', errorHandler);
            console.log("成功获取到设备信息:", data.data);
            resolve(data.data);
          }
        };
        
        // 🔧 创建错误响应处理器
        let errorHandler = (data) => {
          if (data.type === 'error' && data.data && data.data.message && data.data.message.includes(deviceId)) {
            console.warn("WebSocket返回错误:", data.data);
            clearTimeout(timeout);
            topControlWsManager.removeMessageHandler('deviceInfo', deviceInfoHandler);
            topControlWsManager.removeMessageHandler('error', errorHandler);
            
            // 如果是"设备不存在"错误，尝试注册设备
            if (data.data.message.includes("不存在") && deviceType) {
              console.log(`设备 ${deviceId} 不存在`);
              // 返回默认数据
              resolve(null);
            } else {
              // 其他错误则返回null
              resolve(null);
            }
          }
        };
        
        // 🔧 添加临时消息监听
        topControlWsManager.addMessageHandler('deviceInfo', deviceInfoHandler);
        topControlWsManager.addMessageHandler('error', errorHandler);
        
        // 发送WebSocket消息获取设备信息
        const success = sendWsMessage({
          type: 'getDeviceInfo', // 使用正确的消息类型
          payload: { id: deviceId }
        });
        
        if (!success) {
          console.warn("WebSocket消息发送失败");
          clearTimeout(timeout);
          topControlWsManager.removeMessageHandler('deviceInfo', deviceInfoHandler);
          topControlWsManager.removeMessageHandler('error', errorHandler);
          resolve(null);
        }
      });
      
      const deviceInfo = await deviceInfoPromise;
      if (deviceInfo) {
        return deviceInfo;
      }
    }
    // 如果失败，使用默认值
    console.log(`无法从后端获取设备 ${deviceId} 的信息，使用默认值`);
    
    // 如果无法确定设备类型，返回null
    console.warn("无法确定设备类型，无法创建默认信息");
    return null;
  } catch (error) {
    console.error("获取设备信息失败:", error);
    return null;
  }
};

// 处理设备点击事件
const handleDeviceClick = async (e) => {
  try {
    // 获取节点ID
    let nodeId = null;
    if (e.itemId) {
      nodeId = e.itemId;
    } else if (e.item && e.item.id) {
      nodeId = e.item.id;
    } else if (e.target && e.target.get && typeof e.target.get === "function") {
      try {
        nodeId = e.target.get("id");
      } catch (err) {
        console.log("获取target.id失败:", err);
      }
    }

    if (!nodeId) {
      console.warn("无法获取节点ID，取消处理设备点击");
      return;
    }

    // 使用新的selectDevice函数处理设备选择
    selectDevice(nodeId);
  } catch (error) {
    console.error("处理设备点击失败:", error);
    errorMessage.value = `处理设备点击失败: ${error.message}`;
  }
};

// 更新节点外观以反映设备状态
const updateNodeAppearance = (nodeId, status) => {
  console.log('!!!!!!!!!!!!更新节点外观:', nodeId, status);
  if (!graph) return;
  
  try {
    let strokeColor = "#1890ff"; // 默认边框颜色
    let shadowColor = "rgba(0,0,0,0.1)"; // 默认阴影颜色
    
    // 根据状态设置样式
    switch (status) {
      case "running":
    case "open":
      case "heating":
        strokeColor = "#67c23a"; // 绿色
        shadowColor = "rgba(103, 194, 58, 0.3)";
      break;
      case "stopped":
      case "closed":
      case "idle":
        strokeColor = "#909399"; // 灰色
        shadowColor = "rgba(144, 147, 153, 0.3)";
      break;
      case "error":
        strokeColor = "#f56c6c"; // 红色
        shadowColor = "rgba(245, 108, 108, 0.3)";
        break;
      case "cooling":
        strokeColor = "#1890ff"; // 蓝色
        shadowColor = "rgba(24, 144, 255, 0.3)";
      break;
    }
    
    // 更新节点样式
    graph.updateNodeData([
      {
        id: nodeId,
        style: {
          stroke: strokeColor,
          shadowColor: shadowColor,
          shadowBlur: 10
        }
      }
    ]);
    graph.render();
  } catch (error) {
    console.error("更新节点外观失败:", error);
  }
};

// 控制面板显示状态
const showControlPanel = ref(false);

// 拖动相关数据
const panelPosition = ref({ x: 300, y: 100 }); // 面板初始位置
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// 关闭控制面板
const closeControlPanel = () => {
  showControlPanel.value = false;
  selectedDevice.value = null;
  // 重置控制参数对象
  controlParams.value = {};
};

// 拖动相关方法
const startDrag = (event) => {
  isDragging.value = true;
  const rect = event.currentTarget.closest('.device-control-panel').getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  
  // 添加全局事件监听器
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  
  // 防止文本选择
  event.preventDefault();
};

const onDrag = (event) => {
  if (!isDragging.value) return;
  
  const newX = event.clientX - dragOffset.value.x;
  const newY = event.clientY - dragOffset.value.y;
  
  // 限制面板在视窗内
  const maxX = window.innerWidth - 400; // 面板宽度约400px
  const maxY = window.innerHeight - 300; // 面板高度约300px
  
  panelPosition.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY))
  };
};

const stopDrag = () => {
  isDragging.value = false;
  
  // 移除全局事件监听器
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 定时刷新设备数据
let refreshInterval = null;

// 启动定时刷新
const startDeviceDataRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = setInterval(async () => {
    // 如果当前有选中的设备，刷新其数据
    if (selectedDevice.value && showControlPanel.value) {
      try {
        const updatedDevice = await fetchDeviceInfo(selectedDevice.value);
        if (updatedDevice) {
          // 只更新设备状态数据，不影响控制参数
          deviceData.value = updatedDevice;
          // 同时更新节点外观
          updateNodeAppearance(selectedDevice.value, updatedDevice.status);
        }
      } catch (error) {
        console.error("刷新设备数据失败:", error);
      }
    }
  }, 3000); // 每3秒刷新一次
};

// 停止定时刷新
const stopDeviceDataRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};


// 🔧 初始化TopControl专用的WebSocket管理器
const topControlWsManager = new TopControlWebSocketManager();

// 🔧 从优化的WebSocket管理器获取响应式状态
const wsConnected = topControlWsManager.wsConnected;
const isHardwareConnected = topControlWsManager.isHardwareConnected;
const hardwareIP = topControlWsManager.hardwareIP;
const hardwareErrorMessage = topControlWsManager.hardwareErrorMessage;
const isHardwareConnecting = topControlWsManager.isHardwareConnecting;

// 新增：任务与工作流相关的响应式状态
const taskStatuses = topControlWsManager.taskStatuses;
const runningTasks = topControlWsManager.runningTasks;
const workflowEvents = topControlWsManager.workflowEvents;

// 调整图形大小的函数
const resizeGraph = () => {
  if (!graph || !container.value) return;
  
  const width = container.value.clientWidth;
  const height = container.value.clientHeight || 600;
  
  graph.setSize([width, height]);
  graph.render();
  console.log(`调整图形大小至 ${width}x${height}`);
};

// 🔧 使用优化的WebSocket管理器的连接方法
const connectWebSocket = async () => {
  try {
    await topControlWsManager.connect();
    console.log('TopControl WebSocket连接成功');
    // 新增：连接成功后拉取运行中任务，保证初次状态同步
    await topControlWsManager.sendMessage({ type: 'getRunningTasks' });
  } catch (error) {
    console.error('TopControl WebSocket连接失败:', error);
    errorMessage.value = `连接失败: ${error.message}`;
  }
};


// 更新设备状态
const updateDeviceStatus = (deviceData) => {
  // 首先更新全局设备仓库
  if (deviceData.id) {
    // 如果设备已存在，合并数据；否则添加新设备
    if (globalDevices.value.has(deviceData.id)) {
      const existingDevice = globalDevices.value.get(deviceData.id);
      
      // 检查是否有该设备的待发送更改
      const deviceKey = `${deviceData.type}_${deviceData.id}`;
      const hasPendingChanges = pendingChanges.value.has(deviceKey);
      
      // 合并设备数据，但保留待发送的本地修改
      const updatedDevice = {...existingDevice, ...deviceData};
      
      // 如果有待发送更改，保留用户编辑的值
      if (hasPendingChanges) {
        const pendingParams = pendingChanges.value.get(deviceKey).params;
        Object.keys(pendingParams).forEach(key => {
          updatedDevice[key] = pendingParams[key];
        });
      }
      
      globalDevices.value.set(deviceData.id, updatedDevice);
    } else {
      globalDevices.value.set(deviceData.id, deviceData);
    }
    
    // 更新图上的设备节点状态
    if (graph) {
      const node = graph.findById(deviceData.id);
      if (node) {
        // 更新节点状态
        graph.updateItem(node, {
          status: deviceData.status,
          ...deviceData
        });
      }
    }
    
    // 如果是当前选中的设备，从全局仓库获取最新数据更新控制面板
    if (selectedDevice.value === deviceData.id) {
      const updatedDeviceData = globalDevices.value.get(deviceData.id);
      // 深拷贝确保控制面板数据独立
      deviceData.value = JSON.parse(JSON.stringify(updatedDeviceData));
    }
  }
};

// 🔧 使用优化的WebSocket管理器发送消息
const sendWsMessage = (message) => {
  return topControlWsManager.sendWsMessage(message);
};



// 🔧 手动关闭标志不再需要，由共享连接管理器处理

// 🔧 使用优化的WebSocket管理器处理消息
const handleWsMessage = (data) => {
  // 通过优化的WebSocket管理器处理消息
  topControlWsManager.handleMessage(data);
  
  // 处理TopControl界面特定的消息
  if (!data || !data.type) return;
  
  switch (data.type) {
    case 'devices':
      // 收到所有设备列表
      if (data.data && Array.isArray(data.data)) {
        // 更新全局设备仓库
        data.data.forEach(device => {
          globalDevices.value.set(device.id, device);
        });
        console.log(`全局设备仓库已更新，共 ${globalDevices.value.size} 个设备`);
        
        // 如果已有选中的路径，加载设备到图中
        if (selectedPath.value) {
          (selectedPath.value);
        }
      }
      break;
      
    case 'deviceInfo':
      // 设备信息响应 - 单个设备的详细信息
      console.log("收到设备信息:", data.data);
      if (data.data && data.data.id) {
        // 更新设备节点外观
        updateDeviceOnGraph(data.data);
        
        // 如果是当前选中设备，更新控制面板
        if (selectedDevice.value === data.data.id) {
          deviceData.value = data.data;
        }
      }
      break;
      
    case 'commandResult':
      // 命令执行结果
      console.log("命令执行结果:", data.data);
      if (data.data && data.data.success) {
        // 命令成功，根据命令类型和参数更新本地设备状态
        const command = data.data.command;
        if (command && command.id) {
          // 如果命令中包含了更新后的设备数据，直接使用
          if (data.data.deviceData) {
            updateDeviceOnGraph(data.data.deviceData);
            
            // 如果是当前选中的设备，更新控制面板
            if (selectedDevice.value === command.id) {
              deviceData.value = data.data.deviceData;
            }
          }
                }
      }
      break;
      
    case 'parameterUpdateResults':
      // 批量参数更新结果
      console.log("收到参数更新结果:", data.data);
      
      // 处理批量结果
      if (data.data) {
        // 使用后端提供的统计数据
        const { results, totalCommands, successCount, failedCount, message, actualSentCommands } = data.data;
        
        // 如果有消息字段，说明是特殊情况（如所有参数都是最新状态）
        if (message) {
          console.log(message);
          // 显示信息提示
          ElMessage.info(message);
          isLoading.value = false;
          isCommandSending.value = false;
          pendingChanges.value.clear();
          return;
        }
        
        // 处理每个设备的更新结果
        if (Array.isArray(results)) {
          const errorMessages = [];
          
          // 处理每个设备的更新结果
          results.forEach(result => {
            if (result.success) {
              // 如果包含了更新后的设备数据，直接使用
              if (result.deviceData) {
                // 更新全局设备仓库
                if (result.deviceData.id) {
                  globalDevices.value.set(result.deviceData.id, result.deviceData);
                }
                
                // 更新设备节点外观
                updateDeviceOnGraph(result.deviceData);
                
                // 如果是当前选中的设备，更新控制面板
                if (selectedDevice.value === result.deviceData.id) {
                  deviceData.value = result.deviceData;
                }
              }
              // 否则使用设备ID从全局仓库获取并预测更新
              else if (result.id) {
                // 尝试从全局设备仓库获取设备
                if (globalDevices.value.has(result.id)) {
                  const device = globalDevices.value.get(result.id);
                  
                  // 更新全局设备仓库 - 这里不做具体更改，等待后端推送最新状态
                  // 只是标记设备状态有变化
                  const updatedDevice = { ...device, _updated: true };
                  globalDevices.value.set(result.id, updatedDevice);
                  
                  // 更新设备节点外观
                  updateDeviceOnGraph(updatedDevice);
                  
                  // 如果是当前选中的设备，更新控制面板
                  if (selectedDevice.value === result.id) {
                    deviceData.value = updatedDevice;
                  }
                }
              }
            } else {
              // 更新失败，收集错误消息
              if (result.error) {
                errorMessages.push(`${result.id || '未知设备'}: ${result.error}`);
              }
            }
          });
          
          // 显示结果通知
          if (failedCount === 0) {
            // 全部成功
            if (actualSentCommands < totalCommands) {
              // 有些命令被优化掉了（参数无变化）
              ElMessage.success(`已成功更新${successCount}个设备参数，${totalCommands - actualSentCommands}个无需更新`);
            } else {
              // 所有命令都发送了
              ElMessage.success(`已成功更新${successCount}个设备参数`);
            }
          } else {
            // 有失败的情况
            console.error(`${failedCount}个参数更新失败，${successCount}个成功`);
            
            // 显示详细错误信息
            if (errorMessages.length > 0) {
              const errorMsg = errorMessages.length > 3 
                ? `${errorMessages.slice(0, 3).join('\n')}...等${errorMessages.length}个错误` 
                : errorMessages.join('\n');
              ElMessage.error(`参数更新失败: ${errorMsg}`);
              errorMessage.value = `参数更新失败: ${errorMsg}`;
            } else {
              ElMessage.error(`${failedCount}个参数更新失败，${successCount}个成功`);
              errorMessage.value = `${failedCount}个参数更新失败，${successCount}个成功`;
            }
          }
        }
      }
      
      // 重置加载和发送状态
      isLoading.value = false;
      isCommandSending.value = false;
      
      // 清空待发送参数队列
      pendingChanges.value.clear();
      
      break;
      
    case 'error':
      // 错误消息
      console.error("服务器错误:", data.data);
      errorMessage.value = data.data.message;
      isLoading.value = false;
      break;

    case 'hardwareConnection':
      // 硬件连接状态
      isHardwareConnecting.value = false;
      if (data.data.success) {
        console.log("已连接到硬件:", data.data.ipAddress || data.data.portPath);
        isHardwareConnected.value = true;
        hardwareErrorMessage.value = '';
        ElMessage.success('硬件设备连接成功');
      } else {
        const errorMsg = data.data.error || '无法连接硬件设备';
        console.error("硬件连接失败:", errorMsg);
        hardwareErrorMessage.value = errorMsg;
        isHardwareConnected.value = false;
        ElMessage.error(`硬件连接失败: ${errorMsg}`);
      }
      isLoading.value = false;
      break;
      
    case 'serverStatus':
      // 服务器状态信息
      console.log("服务器状态:", data.data);
      isHardwareConnected.value = data.data.connected;
      if (!data.data.connected) {
        hardwareIP.value = data.data.lastIpAddress || '192.168.1.14';
      }
      break;
      
    case 'hardwareStatus':
      // 硬件连接状态信息
      console.log("硬件状态:", data.data);
      isHardwareConnected.value = data.data.connected;
      isHardwareConnecting.value = false;
      
      // 如果已连接到硬件，更新UI状态
      if (data.data.connected) {
        console.log('已成功连接到硬件');
        hardwareErrorMessage.value = '';
        // 如果有IP地址信息，更新显示
        if (data.data.ip) {
          hardwareIP.value = data.data.ip;
        }
        
        // 显示成功通知（但避免频繁通知）
        if (isHardwareConnecting.value) {
          ElMessage.success('成功连接到硬件设备');
        }
      } else {
        console.warn('未连接到硬件');
        // 如果有失败原因，显示
        if (data.data.error) {
          hardwareErrorMessage.value = data.data.error;
          
          // 如果正在连接中，才显示错误通知
          if (isHardwareConnecting.value) {
            ElMessage.error(`连接硬件失败: ${data.data.error}`);
          }
        }
      }
      
      // 无论如何都结束连接状态
      isHardwareConnecting.value = false;
      break;
      
    case 'deviceStatus':
      // 来自硬件的设备状态数据
      console.log(`收到来自控制器${data.controllerId}的设备状态更新:`, data.devices);
      
      // 更新设备状态
      if (data.devices && Array.isArray(data.devices)) {
        data.devices.forEach(device => {
          updateDeviceStatus(device);
        });
      }
      break;
      
    default:
      // 其他消息类型由共享连接管理器处理
      console.log("未知消息类型，由共享连接管理器处理:", data.type);
      break;
  }
};

// 加载保存的硬件结构列表
const loadSavedPaths = async () => {
  try {
    isLoading.value = true;
    
    // 确定API基础URL
    let baseUrl = '';
    if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:3000'; // 开发环境下的后端地址
    }
    
    // 从后端API获取自定义硬件结构列表
    console.log("从后端API获取硬件结构列表...");
    try {
      const response = await axios.get(`${baseUrl}/chem-api/devices/path`);
      
      if (response.data.code === 0 && response.data.data) {
        // 更新保存的路径列表
        savedPaths.value = response.data.data;
        console.log("从API加载了", savedPaths.value.length, "个保存的硬件结构");
        
        // 更新localStorage
        localStorage.setItem('savedReactionPaths', JSON.stringify(savedPaths.value));
      } else {
        console.warn("API返回错误或无效数据:", response.data);
        
        // 尝试从localStorage加载作为备用
        loadFromLocalStorage();
      }
    } catch (apiError) {
      console.error("从API加载路径列表失败:", apiError);
      errorMessage.value = `无法从服务器加载硬件结构列表: ${apiError.message}`;
      
      // 尝试从localStorage加载作为备用
      loadFromLocalStorage();
    }
  } catch (error) {
    console.error("加载保存的硬件结构列表失败:", error);
    
    // 重置为空数组，确保UI不会崩溃
    savedPaths.value = [];
  } finally {
    isLoading.value = false;
  }
};

// 从本地存储加载硬件结构列表
const loadFromLocalStorage = () => {
  // 从localStorage加载
  const savedPathsJson = localStorage.getItem('savedReactionPaths');
  if (savedPathsJson) {
    try {
      savedPaths.value = JSON.parse(savedPathsJson);
      console.log("从本地存储加载了", savedPaths.value.length, "个保存的硬件结构");
    } catch (parseError) {
      console.error("解析本地存储的路径列表失败:", parseError);
      // 如果JSON解析失败，重置为空数组
      savedPaths.value = [];
      localStorage.removeItem('savedReactionPaths');
    }
  } else {
    savedPaths.value = [];
  }
};

// 组件挂载完成后初始化图表
onMounted(async () => {
  try {
    console.log("组件挂载完成");
    
    // 🎯 移除URL解析，只使用postMessage模式
    // 确保侧边栏打开
    isSidebarOpen.value = true;
    
    // 初始化G6 v5图
    const graphWidth = container.value.clientWidth;
    const graphHeight = container.value.clientHeight || 600;
    
    console.log(`初始化图形，尺寸: ${graphWidth}x${graphHeight}`);

    
    // 创建图形实例
    graph = new Graph({
      container: container.value,
      width: graphWidth,
      height: graphHeight,
      behaviors: [
        {
          type: 'drag-canvas',
          key: 'drag-canvas',
          enable: true
        },
        {
          type: 'zoom-canvas',
          sensitivity: 1.5, // 配置灵敏度
          key: 'zoom-canvas',
          enable: true
        },
        {
          type: 'click-select',
          key: 'click-select',
          enable: true
        },
        {
          type: 'drag-element', // 节点拖拽行为
          key: 'drag-element',
          enable: true, // 始终启用节点拖拽
          updateEdge: true, // 拖拽时更新关联的边
          delegateStyle: {
            fillOpacity: 0.4,
            fill: '#91d5ff',
            stroke: '#1890ff'
          }
        }
      ],
    });
    
    // 注册节点点击事件
    graph.on('node:click', (e) => {
      // 原有的处理逻辑
      handleDeviceClick(e);
      
      // 如果处于编辑模式，添加参数设置处理
      if (isEditMode.value) {
        const model = e.item.getModel();
        const deviceId = model.id;
        
        // 检查是否为设备节点且在匹配路径中
        if (deviceId && editTaskData.value.matchedPath.includes(deviceId)) {
          openDeviceParameterPanel(deviceId);
        }
      }
    });
    
    // 注册边更新事件 - 用于反应路径
    graph.on('afteraddedge', () => {
      console.log("图中添加了新边，更新反应路径边数据");
      updateReactionPathEdges();
    });
    
    graph.on('afterremoveedge', () => {
      console.log("图中移除了边，更新反应路径边数据");
      updateReactionPathEdges();
    });
    
    // 加载保存的硬件结构列表和现有设备
    await loadSavedPaths();
    
    // 🎯 只使用postMessage模式，延迟检查编辑模式
    setTimeout(() => {
      if (!isEditMode.value) {
        // 只有在确认不是编辑模式时才加载默认数据
        console.log('🔍 延迟检查：非编辑模式，加载默认反应路径数据');
        loadMappingData();
      } else {
        console.log('🔍 延迟检查：编辑模式已激活，跳过默认数据加载');
      }
    }, 2000); // 延迟2秒，等待postMessage
    
    // 启动设备数据刷新
    startDeviceDataRefresh();
    
    // 处理窗口大小变化 - 带防抖
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeGraph();
        
        // 如果当前有选中的反应路径，更新高亮
        if (selectedReactionPathIndex.value !== null) {
          selectReactionPath(selectedReactionPathIndex.value);
        }
      }, 200);
    });
    
    // 延迟建立WebSocket连接，确保其他组件准备就绪
    setTimeout(() => {
      // 建立WebSocket连接
      connectWebSocket();
    }, 500);
    
    // 添加消息监听
    console.log('🎯 设置postMessage监听器');
    window.addEventListener('message', (event) => {
      try {
        console.log('🎯 收到postMessage消息:', event.data);
        console.log('🎯 消息来源:', event.origin);
        console.log('🎯 消息源窗口:', event.source);
        
        // 处理来自task页面的EDIT_TASK_DATA消息
        if (event.data && event.data.type === 'EDIT_TASK_DATA') {
          const editData = JSON.parse(event.data.data);
          console.log('🎯 收到编辑任务数据:', editData);
          
          if (editData.editMode && editData.editData) {
            // 设置编辑模式
            isEditMode.value = true;
            editTaskData.value = editData.editData;
            
            console.log('🔧 编辑数据检查:');
            console.log('🔧 - taskId:', editTaskData.value.taskId);
            console.log('🔧 - taskKey:', editTaskData.value.taskKey);
            console.log('🔧 - matchedPath:', editTaskData.value.matchedPath);
            console.log('🔧 - pathGraph:', editTaskData.value.pathGraph);
            console.log('🔧 - queueResult:', editTaskData.value.queueResult);
            console.log('🔧 - isScheduledEdit:', editData.isScheduledEdit);
            
            // 🎯 立即从task数据创建反应路径
            const taskReactionPath = createReactionPathFromTaskData(editTaskData.value);
            if (taskReactionPath) {
              reactionPaths.value = [taskReactionPath];
              selectedReactionPathIndex.value = 0;
              console.log('✅ 收到task数据：已创建反应路径', taskReactionPath);
              console.log('✅ 当前反应路径数量:', reactionPaths.value.length);
              console.log('✅ 选中的反应路径索引:', selectedReactionPathIndex.value);
            } else {
              console.error('❌ 无法从task数据创建反应路径');
            }
            
            // 🎯 在编辑模式下自动显示反应路径面板
            isShowingReactionPath.value = true;
            
            // 初始化设备参数对象
            if (editTaskData.value.matchedPath && Array.isArray(editTaskData.value.matchedPath)) {
              editTaskData.value.matchedPath.forEach(deviceId => {
                deviceParameters.value[deviceId] = {
                  id: deviceId,
                  // 根据设备类型设置默认参数
                  parameters: getDefaultParametersForDevice(deviceId)
                };
              });
            }
            
            // 如果有反应时间，设置为默认值
            if (editTaskData.value.reactTime) {
              deviceParameters.value.reactTime = editTaskData.value.reactTime;
            }
            
            // 🔧 修复：优先使用pathGraph数据加载图形结构
            let graphDataToLoad = null;
            
            // 优先级1：使用pathGraph（来自queueResult）
            if (editTaskData.value.pathGraph && Object.keys(editTaskData.value.pathGraph).length > 0) {
              graphDataToLoad = editTaskData.value.pathGraph;
              console.log('✅ 使用pathGraph数据加载图形:', graphDataToLoad);
            }
            // 优先级2：使用matchData（向后兼容）
            else if (editTaskData.value.matchData && Object.keys(editTaskData.value.matchData).length > 0) {
              graphDataToLoad = editTaskData.value.matchData;
              console.log('✅ 使用matchData数据加载图形:', graphDataToLoad);
            }
            // 优先级3：检查是否已有硬件结构，直接高亮路径
            else if (graph && graph.getNodeData().length > 0) {
              console.log('✅ 已有硬件结构，直接高亮反应路径');
              setTimeout(() => {
                highlightReactionPathInExistingGraph();
              }, 500);
              return; // 不需要加载新的图形数据
            }
            // 优先级4：加载默认硬件结构
            else if (savedPaths.value.length > 0) {
              console.log('⚠️ 没有图形数据，加载默认硬件结构');
              setTimeout(async () => {
                await loadStructureFromFile(savedPaths.value[0]);
                // 加载完成后高亮反应路径
                setTimeout(() => {
                  highlightReactionPathInExistingGraph();
                }, 1000);
              }, 500);
              return;
            }
            
            // 如果有图形数据，加载它
            if (graphDataToLoad) {
              setTimeout(async () => {
                console.log('🔄 开始加载图形数据...');
                await loadGraphFromMatchData(graphDataToLoad);
                
                // 🎯 图形加载完成后，确保反应路径高亮显示
                setTimeout(() => {
                if (reactionPaths.value.length > 0 && selectedReactionPathIndex.value !== null) {
                  selectReactionPath(selectedReactionPathIndex.value);
                    console.log('✅ 编辑模式：图形加载完成，已高亮显示反应路径');
                  } else {
                    console.log('⚠️ 尝试手动高亮反应路径');
                    highlightReactionPathInExistingGraph();
                }
              }, 1000);
              }, 1000);
            } else {
              console.warn('⚠️ 没有可用的图形数据，无法加载图形结构');
            }
          }
        }
      } catch (error) {
        console.error('处理postMessage消息失败:', error);
        errorMessage.value = `处理消息失败: ${error.message}`;
      }
    });
    console.log("组件初始化完成");
    
    // 🎯 调试窗口环境信息
    console.log('🎯 当前窗口信息:');
    console.log('🎯 window.parent === window:', window.parent === window);
    console.log('🎯 window.top === window:', window.top === window);
    console.log('🎯 是否在iframe中:', window.parent !== window);
    console.log('🎯 当前URL:', window.location.href);
    
    // 🎯 添加手动测试postMessage的功能
    window.testPostMessage = () => {
      console.log('🎯 手动测试postMessage');
      const testData = {
        type: 'EDIT_TASK_DATA',
        data: JSON.stringify({
          editMode: true,
          editData: {
            taskId: 'test-task',
            taskKey: 'test-key',
            taskName: '测试任务',
            product: '测试产物',
            matchedPath: ['pump-1', 'valve-1', 'chip-1'],
            reactTime: 2
          }
        })
      };
      window.postMessage(testData, '*');
    };
    console.log('🎯 可以在控制台运行 window.testPostMessage() 来测试postMessage');
    
    // 确保pendingChanges已正确初始化
    if (!pendingChanges.value) {
      pendingChanges.value = new Map();
    }
    
    // 连接WebSocket
    await connectWebSocket();
    
    // 请求当前硬件状态
    if (wsConnected.value) {
      // 延迟一点请求当前状态，确保WebSocket连接已完全建立
      setTimeout(() => {
        sendWsMessage({
          type: 'getHardwareStatus'
        });
      }, 1000);
    }
    
    setTimeout(() => {
      if (graph && graph.getNodeData().length > 0) {
        // 已有硬件结构数据，更新反应路径
        updateReactionPathEdges();
      }
    }, 2000); // 延迟2秒，确保其他初始化完成
    
  } catch (error) {
    console.error("组件挂载出错:", error);
    errorMessage.value = `初始化出错: ${error.message}`;
  }
});

onBeforeUnmount(() => {
  console.log("销毁G6");
  // 停止定时刷新
  stopDeviceDataRefresh();
  // 销毁图表
  graph?.destroy();

  // 🔧 断开WebSocket连接
  
 
  // 断开WebSocket连接
  disconnectWebSocket();
  
});

// 监听控制面板的显示状态，控制刷新
watch(showControlPanel, (newVal) => {
  if (!newVal) {
    // 面板关闭时，停止刷新
    stopDeviceDataRefresh();
  } else {
    // 面板打开时，启动刷新
    startDeviceDataRefresh();
  }
});

// 监听流程执行状态变化
watch(() => workflowExecutor.status, (newStatus, oldStatus) => {
  if (newStatus === 'completed' && oldStatus === 'running') {
    ElMessage.success(`流程 "${currentWorkflow.name}" 已成功完成！`);
    
    // 延迟关闭执行面板
    setTimeout(() => {
      isRunningWorkflow.value = false;
    }, 2000);
  } else if (newStatus === 'error') {
    ElMessage.error(`流程执行出错`);
  }
});
// 监听WebSocket连接状态变化
watch(wsConnected, (newValue) => {
  if (newValue && isRunningWorkflow.value) {
    // WebSocket重新连接后，如果正在执行流程，提示用户
    ElMessage.warning('WebSocket连接已恢复，但流程执行可能已中断，建议重新执行流程');
  }
});

// 🎯 监听编辑模式状态变化，用于调试
watch(isEditMode, (newValue, oldValue) => {
  console.log('🔄 编辑模式状态变化:', oldValue, '->', newValue);
  if (newValue) {
    console.log('✅ 进入编辑模式');
  } else {
    console.log('❌ 退出编辑模式');
  }
});

// 🎯 监听编辑数据变化，用于调试
watch(editTaskData, (newValue, oldValue) => {
  console.log('🔄 编辑数据变化:', oldValue, '->', newValue);
  if (newValue) {
    console.log('✅ 编辑数据已设置:', newValue);
  } else {
    console.log('❌ 编辑数据已清空');
  }
});


// 选择设备并添加到图中
const selectDeviceAndAddToGraph = (device) => {
  const { x, y } = dropPosition.value;
  
  // 根据设备类型获取图标
  let iconSrc = null;
  let label = "";
  
  switch (device.type) {
    case "pump": iconSrc = pump; label = "泵"; break;
    case "valve": iconSrc = valve; label = "阀"; break;
    case "chip": iconSrc = chip; label = "加热芯片"; break;
    case "mfc": iconSrc = mfc; label = "MFC控制器"; break;
    case "light": iconSrc = light; label = "光照控制"; break;
    case "bottle": iconSrc = bottle; label = "瓶"; break;
  }
  
  // 打印图标信息以帮助调试
  console.log(`设备类型 ${device.type} 的图标:`, iconSrc);
  
  // 添加到图中
  addDeviceToGraph(device, iconSrc, label, x, y);
  
  // 关闭对话框
  showDeviceSelectionDialog.value = false;
};


// 🔧 存储用户修改的参数 - 使用统一消息格式
const updateParameter = (deviceId, deviceType, paramName, value) => {
  let uniqueDeviceKey = `${deviceType}_${deviceId}`;
  
  // 确保pendingChanges是一个有效的响应式Map对象
  if (!pendingChanges.value) {
    pendingChanges.value = new Map();
  }
  
  if (!pendingChanges.value.has(uniqueDeviceKey)) {
    pendingChanges.value.set(uniqueDeviceKey, {
      deviceId: deviceId,
      deviceType: deviceType,
      params: {}
    });
    console.log(`为设备${uniqueDeviceKey}创建新的参数变更对象`);
  }
  
  const deviceChanges = pendingChanges.value.get(uniqueDeviceKey);
  deviceChanges.params[paramName] = value;
  console.log(`设备 ${deviceId} 的参数 ${paramName} 已更新为 ${value}`);
  console.log("当前待发送变更数量:", pendingChanges.value.size);
  console.log("pendingChanges详情:", JSON.stringify(Array.from(pendingChanges.value.entries()), null, 2)); 
  
  // 🎯 同时更新deviceParameters，确保两种保存方式数据一致
  const deviceKey = `${deviceType}-${deviceId}`;
  if (!deviceParameters.value[deviceKey]) {
    deviceParameters.value[deviceKey] = {
      id: deviceKey,
      parameters: {}
    };
  }
  deviceParameters.value[deviceKey].parameters[paramName] = value;
  console.log(`同时更新deviceParameters[${deviceKey}].parameters.${paramName} = ${value}`);
  
  // 更新后强制界面刷新
  pendingChanges.value = new Map(pendingChanges.value);
  
  // 自动显示参数变更队列面板
  showPendingChangesPanel.value = true;
};
const updateBottle = (deviceId, paramName, value) => {
  deviceData.value.bottle[paramName] = value;
}
// 显示工作流预览对话框状态
const showWorkflowPreviewDialog = ref(false);
const previewWorkflow = ref(null);

// 🎯 执行预览的工作流 - 完全兼容Task界面的通信逻辑
const executePreviewedWorkflow = async () => {
  try {
    if (!previewWorkflow.value) {
      ElMessage.warning('没有可执行的工作流');
      return;
    }

    console.log('🎯 开始执行预览工作流:', previewWorkflow.value);
    
    // 关闭预览对话框
    showWorkflowPreviewDialog.value = false;
    
    // 设置当前工作流并启动执行界面
    Object.assign(currentWorkflow, previewWorkflow.value);
    isRunningWorkflow.value = true;
    
    // 🎯 关键：使用与Task界面完全一致的数据格式
    if (wsConnected.value) {
      console.log('🔧 构建与Task界面完全一致的工作流数据包');
      
      // 🔧 将steps转换为tasks格式（与Task界面一致）
      const executionPlan = [{
        taskId: `platform_task_${Date.now()}`,
        taskName: previewWorkflow.value.name,
        taskKey: 'platform_workflow',
        devicePath: extractDevicePathFromWorkflow(previewWorkflow.value),
        pathGraph: extractPathGraphFromWorkflow(previewWorkflow.value),
        parameters: extractParametersFromWorkflow(previewWorkflow.value),
        reactTime: extractReactionTimeFromWorkflow(previewWorkflow.value),
        expectedDuration: calculateTotalDuration(previewWorkflow.value),
        expectedStates: generateExpectedDeviceStates(previewWorkflow.value),
        // 🆕 添加完整的工作流步骤信息
        workflowSteps: previewWorkflow.value.steps
      }];
      
      // 🎯 使用与Task界面完全相同的数据格式
      const workflowData = {
        type: 'executeWorkflow',
        workflowId: previewWorkflow.value.id,
        startTime: new Date().toISOString(),
        tasks: executionPlan // 与Task界面一致：使用tasks而非steps
      };
      
      // 🎯 使用与Task界面一致的发送机制
      const sent = sendHardwareMessage(workflowData);
      
      if (sent) {
        ElMessage.success('工作流已发送到硬件系统，开始执行');
        console.log('✅ 完整工作流已发送到后端（Task格式）:', workflowData);
      } else {
        ElMessage.warning('硬件WebSocket未连接，工作流已缓存');
      }
    }
    
    // 🎯 启动本地工作流执行器（用于UI状态管理）
    await workflowExecutor.executeWorkflow(previewWorkflow.value);
    
    ElMessage.success(`工作流"${previewWorkflow.value.name}"执行完成！`);
    
  } catch (error) {
    console.error('执行工作流失败:', error);
    ElMessage.error(`执行工作流失败: ${error.message}`);
    
    // 重置执行状态
    isRunningWorkflow.value = false;
    workflowExecutor.status = 'error';
  }
};

// 🎯 辅助函数：从工作流中提取设备路径（兼容Task界面格式）
const extractDevicePathFromWorkflow = (workflow) => {
  const devicePath = [];
  if (workflow.steps && workflow.steps.length > 0) {
    workflow.steps.forEach(step => {
      if (step.deviceCommands) {
        step.deviceCommands.forEach(cmd => {
          if (cmd.deviceId && !devicePath.includes(cmd.deviceId)) {
            devicePath.push(cmd.deviceId);
          }
        });
      }
    });
  }
  return devicePath;
};

// 🎯 辅助函数：从工作流中提取路径图（兼容Task界面格式）
const extractPathGraphFromWorkflow = (workflow) => {
  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    totalSteps: workflow.steps ? workflow.steps.length : 0,
    devices: extractDevicePathFromWorkflow(workflow),
    createdAt: workflow.createdAt
  };
};

// 🎯 辅助函数：从工作流中提取参数（兼容Task界面格式）
const extractParametersFromWorkflow = (workflow) => {
  const parameters = {};
  
  // 从pendingChanges中提取参数
  if (pendingChanges.value && pendingChanges.value.size > 0) {
    for (const [deviceKey, changes] of pendingChanges.value.entries()) {
      const [deviceType, deviceId] = deviceKey.split('_');
      parameters[deviceId] = {
        id: deviceId,
        type: deviceType,
        parameters: { ...changes.params }
      };
    }
  }
  
  return parameters;
};

// 🎯 辅助函数：从工作流中提取反应时间
const extractReactionTimeFromWorkflow = (workflow) => {
  // 从步骤中查找反应运行步骤的时间
  if (workflow.steps) {
    const reactionStep = workflow.steps.find(step => 
      step.name && step.name.includes('反应运行')
    );
    if (reactionStep && reactionStep.duration) {
      return reactionStep.duration / 3600; // 转换为小时
    }
  }
  
  // 默认反应时间
  return 1; // 1小时
};

// 🎯 辅助函数：计算工作流总持续时间
const calculateTotalDuration = (workflow) => {
  let totalDuration = 0;
  if (workflow.steps) {
    workflow.steps.forEach(step => {
      if (step.duration) {
        totalDuration += step.duration;
      }
      if (step.delayAfter) {
        totalDuration += step.delayAfter;
      }
    });
  }
  return totalDuration;
};

// 🎯 辅助函数：生成期望的设备状态（兼容Task界面）
const generateExpectedDeviceStates = (workflow) => {
  const expectedStates = new Map();
  
  if (workflow.steps) {
    workflow.steps.forEach(step => {
      if (step.deviceCommands) {
        step.deviceCommands.forEach(cmd => {
          const deviceId = cmd.deviceId;
          const deviceType = cmd.deviceType;
          
          if (!expectedStates.has(deviceId)) {
            expectedStates.set(deviceId, {
              deviceId,
              deviceType,
              expectedActions: [],
              finalState: {}
            });
          }
          
          const deviceState = expectedStates.get(deviceId);
          deviceState.expectedActions.push({
            action: cmd.action,
            parameters: cmd.parameters,
            stepName: step.name
          });
          
          // 根据命令预测最终状态
          if (cmd.action === 'setTemp' && cmd.parameters.temperature) {
            deviceState.finalState.targetTemp = cmd.parameters.temperature;
          }
          if (cmd.action === 'setPosition' && cmd.parameters.position !== undefined) {
            deviceState.finalState.position = cmd.parameters.position;
          }
          if (cmd.action === 'setPort' && cmd.parameters.port !== undefined) {
            deviceState.finalState.port = cmd.parameters.port;
          }
        });
      }
    });
  }
  
  return Object.fromEntries(expectedStates);
};

// 🎯 使用与Task界面一致的硬件消息发送机制
const messageQueue = ref([]);
const maxQueueSize = ref(50);
// isHardwareConnected 在前面已声明，这里不重复声明

// 🎯 发送硬件消息（使用优化的WebSocket管理器）
const sendHardwareMessage = (message) => {
  if (isHardwareConnected.value && wsConnected.value) {
    try {
      const success = topControlWsManager.sendMessage(message);
      if (success) {
        console.log('📤 消息已发送:', message.type);
        return true;
      } else {
        cacheMessage(message);
        return false;
      }
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
      cacheMessage(message);
      return false;
    }
  } else {
    console.warn('⚠️ WebSocket未连接，消息已缓存');
    cacheMessage(message);
    return false;
  }
};

// 🎯 缓存消息（复制Task界面逻辑）
const cacheMessage = (message) => {
  if (messageQueue.value.length >= maxQueueSize.value) {
    messageQueue.value.shift(); // 移除最旧的消息
  }
  
  messageQueue.value.push({
    ...message,
    timestamp: Date.now(),
    retries: 0
  });
  
  console.log(`📥 消息已缓存 (队列长度: ${messageQueue.value.length})`);
};

// 🎯 处理缓存的消息（复制Task界面逻辑）
const processCachedMessages = () => {
  if (messageQueue.value.length === 0) {
    return;
  }
  
  console.log(`📤 处理 ${messageQueue.value.length} 个缓存消息`);
  
  const messages = [...messageQueue.value];
  messageQueue.value = [];
  
  messages.forEach((message, index) => {
    setTimeout(() => {
      if (isHardwareConnected.value) {
        delete message.timestamp;
        delete message.retries;
        sendHardwareMessage(message);
      } else {
        cacheMessage(message);
      }
    }, index * 100); // 间隔100ms发送，避免消息过快
  });
};

// 🎯 修正设备命令发送格式（与Task界面一致）
workflowExecutor.sendDeviceCommand = async function(cmd) {
  console.log(`🎮 发送设备命令（Task格式）:`, cmd);
  
  return new Promise((resolve, reject) => {
    if (!wsConnected.value) {
      console.warn('硬件WebSocket未连接，使用模拟执行');
      // 模拟执行延迟
      setTimeout(() => {
        console.log(`模拟执行设备命令: ${cmd.deviceType} ${cmd.deviceId} - ${cmd.action}`);
        resolve({
          deviceId: cmd.deviceId,
          success: true,
          simulated: true,
          timestamp: new Date()
        });
      }, Math.random() * 2000 + 500); // 0.5-2.5秒随机延迟
      return;
    }
    
    try {
      // 🔧 使用与Task界面完全一致的命令格式
      const hwCommand = {
        type: 'deviceControl',
        payload: {
          deviceId: cmd.deviceId,
          deviceType: cmd.deviceType,
          action: cmd.action,
          parameters: cmd.parameters
        }
      };
      
      const success = topControlWsManager.sendMessage(hwCommand);
      console.log('已发送硬件命令（Task格式）:', hwCommand);
      
      if (success) {
        // 简单延迟后认为命令发送成功
        setTimeout(() => {
          resolve({
            deviceId: cmd.deviceId,
            success: true,
            timestamp: new Date()
          });
        }, 1000);
      } else {
        reject(new Error('发送硬件命令失败'));
      }
      
    } catch (error) {
      console.error('发送硬件命令失败:', error);
      reject(error);
    }
  });
};

// 🎯 从参数变更队列生成并执行工作流 - 修正为与Task界面一致的逻辑
const generateWorkflowFromPendingChanges = async () => {
  try {
    if (!pendingChanges.value || pendingChanges.value.size === 0) {
      ElMessage.warning('没有待发送的参数更新');
      return;
    }
    
    // 获取当前选择的反应路径名称
    let workflowName = '自动生成的工作流';
    if (selectedReactionPathIndex.value !== null && reactionPaths.value[selectedReactionPathIndex.value]) {
      workflowName = `${reactionPaths.value[selectedReactionPathIndex.value].name} 自动工作流`;
    }
    
    // 🎯 使用task界面的标准工作流生成逻辑
    const workflow = generateTaskWorkflowFromPendingChanges(workflowName);
    
    if (!workflow || workflow.steps.length === 0) {
      ElMessage.warning('无法生成有效的工作流');
      return;
    }
    
    // 保存预览工作流
    previewWorkflow.value = workflow;
    
    // 显示预览对话框
    showWorkflowPreviewDialog.value = true;
    
    console.log('🎯 已生成标准7步工作流:', workflow);
    
  } catch (error) {
    console.error('生成工作流失败:', error);
    ElMessage.error(`生成工作流失败: ${error.message}`);
  }
};

// 🎯 基于Task界面逻辑的工作流生成方法
const generateTaskWorkflowFromPendingChanges = (workflowName) => {
  const workflow = {
    id: `workflow_${Date.now()}`,
    name: workflowName,
    description: '基于参数变更队列生成的专业7步工作流',
    steps: [],
    createdAt: new Date().toISOString()
  };
  
  // 🔧 从pendingChanges分析设备（类似task界面的analyzeDevicesFromTaskParameters）
  const devices = analyzeDevicesFromPendingChanges();
  
  if (!devices || (devices.pumps.length === 0 && devices.valves.length === 0 && 
      devices.heaters.length === 0 && devices.mfcs.length === 0 && devices.lights.length === 0)) {
    console.warn('未找到有效的设备参数');
    return null;
  }
  
  console.log('🔧 从参数变更队列分析的设备:', devices);
  
  // 🎯 专业7步工作流（完全基于Task界面逻辑）
  
  // 步骤1: 初始化反应路径
  workflow.steps.push(createStandardInitializationStep(devices));
  
  // 步骤2: 泵润洗（如果有泵设备）
  if (devices.pumps.length > 0) {
    workflow.steps.push(createStandardPumpRinseStep(devices));
  }
  
  // 步骤3: 抽吸反应溶液
  if (devices.pumps.length > 0) {
    workflow.steps.push(createStandardReagentAspirationStep(devices));
  }
  
  // 步骤4: 反应运行
  workflow.steps.push(createStandardReactionRunStep(devices, { reactTime: 1 })); // 添加任务执行参数
  
  // 步骤5: 反应稳定后切换产品收集阀门
  if (devices.valves.length > 0) {
    const stabilizedValveStep = createStandardStabilizedValveStep(devices);
    if (stabilizedValveStep) {
      workflow.steps.push(stabilizedValveStep);
    }
  }
  
  // 步骤6: 清洗准备（产品收集阀切换 + 吸取清洗液）
  workflow.steps.push(createStandardCleaningPreparationStep(devices));
  
  // 步骤7: 推出清洗液（完成清洗）
  workflow.steps.push(createStandardCleaningExecutionStep(devices));
  
  console.log('🎯 生成的专业工作流:', workflow);
  return workflow;
};

// 🔧 从参数变更队列分析设备（替代简化的设备列表创建）
const analyzeDevicesFromPendingChanges = () => {
  const devices = {
    pumps: [],
    valves: [],
    heaters: [],
    bottles: [],
    mfcs: [],
    lights: []
  };
  
  // 从pendingChanges中解析设备信息
  for (const [deviceKey, changes] of pendingChanges.value.entries()) {
    const [deviceType, deviceId] = deviceKey.split('_');
    
    if (!changes.params || Object.keys(changes.params).length === 0) {
      continue;
    }
    
    const device = {
      id: deviceId,
      type: deviceType,
      parameters: changes.params
    };
    
    // 按设备类型分类
    switch (deviceType) {
      case 'pump':
        devices.pumps.push(device);
        break;
      case 'valve':
        devices.valves.push(device);
        break;
      case 'chip':
      case 'heater':
        devices.heaters.push(device);
        break;
      case 'bottle':
        devices.bottles.push(device);
        break;
      case 'mfc':
        devices.mfcs.push(device);
        break;
      case 'light':
        devices.lights.push(device);
        break;
    }
  }
  
  console.log('🔧 从参数变更队列解析的设备分类:', devices);
  return devices;
};


// 🎯 Task界面标准：创建初始化步骤
const createStandardInitializationStep = (devices) => {
  const commands = [];
  
  // 1. 阀门初始化命令 - 仅对非产品收集阀进行初始化设置
  devices.valves.forEach(valve => {
    if (valve.parameters.port !== undefined && !valve.parameters.isProductValve) {
      commands.push({
        deviceId: valve.id,
        deviceType: 'valve',
        action: 'setPort',
        parameters: { port: valve.parameters.port }
      });
    }
  });
  
  // 🆕 新增：将产品收集阀设置为6号孔位
  const productValve = devices.valves.find(valve => valve.parameters.isProductValve);
  if (productValve) {
    commands.push({
      deviceId: productValve.id,
      deviceType: 'valve',
      action: 'setPort',
      parameters: { port: 6 }  // 产品收集阀设置为6号孔位
    });
  }
  
  // 2. 加热器初始化命令
  devices.heaters.forEach(heater => {
    const params = {};
    if (heater.parameters.targetTemp !== undefined) {
      params.temperature = heater.parameters.targetTemp;
    } else if (heater.parameters.setTemp !== undefined) {
      params.temperature = heater.parameters.setTemp;
    } else if (heater.parameters.temperature !== undefined) {
      params.temperature = heater.parameters.temperature;
    }
    
    if (heater.parameters.heatingSpeed !== undefined) {
      params.speed = heater.parameters.heatingSpeed;
    } else if (heater.parameters.speed !== undefined) {
      params.speed = heater.parameters.speed;
    }
    
    if (Object.keys(params).length > 0) {
      commands.push({
        deviceId: heater.id,
        deviceType: 'chip',
        action: 'setTemp',
        parameters: params
      });
    }
  });
  
  // 3. 泵初始化：设置端口和速度，然后从吸取端口吸取溶液
  devices.pumps.forEach(pump => {
    if (pump.parameters.aspiratePort !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: { port: pump.parameters.aspiratePort }
      });
    }
    
    if (pump.parameters.speed !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setSpeed',
        parameters: { speed: pump.parameters.speed }
      });
    }
    
    if (pump.parameters.position !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'aspirate',
        parameters: { volume: pump.parameters.position }
      });
    }
  });
  
  // 4. MFC初始化命令
  devices.mfcs.forEach(mfc => {
    if (mfc.parameters.flowRate !== undefined || mfc.parameters.setFlowRate !== undefined) {
      commands.push({
        deviceId: mfc.id,
        deviceType: 'mfc',
        action: 'setFlowRate',
        parameters: { flowRate: mfc.parameters.flowRate || mfc.parameters.setFlowRate || 0 }
      });
    }
  });
  
  // 5. 光照控制命令
  devices.lights.forEach(light => {
    if (light.parameters.intensity !== undefined || light.parameters.setIntensity !== undefined) {
      commands.push({
        deviceId: light.id,
        deviceType: 'light',
        action: 'setIntensity',
        parameters: { intensity: light.parameters.intensity || light.parameters.setIntensity || 0 }
      });
    }
  });
  
  // 🔧 构建核心等待条件 - 芯片温度和泵位置
  const conditions = [];
  
  // 等待芯片到达指定温度
  devices.heaters.forEach(heater => {
    const targetTemp = heater.parameters.targetTemp || heater.parameters.setTemp || heater.parameters.temperature;
    if (targetTemp !== undefined) {
      conditions.push({
        type: 'deviceParameter',
        deviceType: 'chip',
        deviceId: heater.id,
        parameter: 'currentTemp',
        comparison: 'approx',
        value: targetTemp,
        tolerance: 2,
        timeout: 180
      });
    }
  });
  
  // 等待泵到达指定位置（初始化时的位置）
  devices.pumps.forEach(pump => {
    if (pump.parameters.position !== undefined) {
      conditions.push({
        type: 'deviceParameter',
        deviceType: 'pump',
        deviceId: pump.id,
        parameter: 'position',
        comparison: 'approx',
        value: pump.parameters.position,
        tolerance: 5,
        timeout: 60
      });
    }
  });
  
  return {
    id: `step-${Date.now()}-init`,
    name: '初始化反应路径',
    description: '设置阀门到初始位置，将产品收集阀设置为6号孔位，启动加热器至目标温度，初始化所有泵',
    deviceCommands: commands,
    conditions: conditions.length > 0 ? conditions : undefined,
    waitForCompletion: true,
    delayAfter: 0
  };
};

// 创建泵润洗步骤
const createStandardPumpRinseStep = (devices) => {
  const commands = [];
  
  devices.pumps.forEach(pump => {
    // 设置泵端口到废液口 - 固定使用6号端口作为废液口
    commands.push({
      deviceId: pump.id,
      deviceType: 'pump',
      action: 'setPort',
      parameters: {
        port: 6 // 固定使用6号端口作为废液口
      }
    });
    
    // 设置泵速度
    if (pump.parameters.speed !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setSpeed',
        parameters: {
          speed: pump.parameters.speed
        }
      });
    }
    
    // 排空泵内溶液到废液口 - 简化：直接设置位置为0
    commands.push({
      deviceId: pump.id,
      deviceType: 'pump',
      action: 'setPosition',
      parameters: { position: 0 }
    });
  });
  
  return {
    id: `step-${Date.now()}-rinse`,
    name: '泵润洗',
    description: '将泵排空至废液口进行润洗，清除可能存在的残留物',
    deviceCommands: commands,
    waitForCompletion: true,
    delayAfter: 0 // 不需要固定延迟，系统会自动基于设备状态判断
  };
};

// 创建抽吸反应溶液步骤
const createStandardReagentAspirationStep = (devices) => {
  const commands = [];
  
  devices.pumps.forEach(pump => {
    // 设置泵端口到反应物端口 - 对于抽吸操作，使用吸取端口
    if (pump.parameters.aspiratePort !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: {
          port: pump.parameters.aspiratePort // 使用吸取端口
        }
      });
    }
    
    // 设置泵速度
    if (pump.parameters.speed !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setSpeed',
        parameters: {
          speed: pump.parameters.speed
        }
      });
    }
    
    // 抽吸反应溶液 - 简化：直接设置泵位置到目标值
    if (pump.parameters.position !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPosition',
        parameters: { position: pump.parameters.position }
      });
    }
  });
  
  // 构建泵位置条件
  const pumpConditions = devices.pumps.map(pump => {
    if (pump.parameters.position !== undefined) {
      return {
        type: 'deviceParameter',
        deviceType: 'pump',
        deviceId: pump.id,
        parameter: 'position',
        comparison: 'approx',
        value: pump.parameters.position,
        tolerance: 5, // 允许5单位误差
        timeout: 60
      };
    }
    return null;
  }).filter(Boolean);

  return {
    id: `step-${Date.now()}-aspirate`,
    name: '抽吸反应溶液',
    description: '从指定端口抽取反应所需的溶液',
    deviceCommands: commands,
    conditions: pumpConditions.length > 0 ? pumpConditions : undefined,
    waitForCompletion: true,
    delayAfter: 0 // 不需要固定延迟，系统会自动基于设备状态判断
  };
};

// 🎯 Task界面标准：创建反应运行步骤 - 简化版
const createStandardReactionRunStep = (devices, taskExecution) => {
  const commands = [];
  
  // 设置泵出液端口并推出溶液
  devices.pumps.forEach(pump => {
    // 1. 设置泵端口到分配端口
    if (pump.parameters.dispensePort !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: { port: pump.parameters.dispensePort }
      });
    }
    
    // 2. 设置泵速度（基于流速）
    if (pump.parameters.flowRate !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setSpeed',
        parameters: { speed: pump.parameters.flowRate * 10 }
      });
    }
    
    // 3. 推出溶液 - 简化：统一设置位置为0（完全推出）
    commands.push({
      deviceId: pump.id,
      deviceType: 'pump',
      action: 'setPosition',
      parameters: { position: 0 }
    });
  });
  
  return {
    id: `step-${Date.now()}-reaction`,
    name: '反应运行',
    description: `将泵内溶液推出并保持${taskExecution.reactTime}小时，固定等待3分钟让反应稳定后进入下一步`,
    deviceCommands: commands,
    // 🆕 第四步：不等待泵位置，改为固定等待3分钟
    waitForCompletion: true,
    duration: taskExecution.reactTime * 3600, // 🔧 使用真实反应时间
    delayAfter: 180 // 固定等待3分钟 = 180秒
  };
};

// 创建反应稳定后阀门切换步骤 - 只针对产品收集阀
const createStandardStabilizedValveStep = (devices) => {
  const commands = [];
  const productValve = devices.valves.find(valve => valve.parameters.isProductValve);
  
  // 如果找到连接产品收集口的阀门，设置它到产品收集位置
  if (productValve && productValve.parameters.port !== undefined) {
    commands.push({
      deviceId: productValve.id,
      deviceType: 'valve',
      action: 'setPort',
      parameters: { port: productValve.parameters.port }
    });
    
    return {
      id: `step-${Date.now()}-valve-switch`,
      name: '切换产品收集阀',
      description: '切换产品收集阀到指定位置，然后等待3分钟稳定后进入废液处理',
      deviceCommands: commands,
      waitForCompletion: true,
      // 🆕 第五步：切换产品收集阀后，等待3分钟再执行第六步
      delayAfter: 180 // 等待3分钟 = 180秒
    };
  }
  
  // 如果没有标记的阀门，返回null
  return null;
};

// 产品收集步骤已被移除，因为普通阀门在初始化时已经设置好，
// 只有产品收集阀在反应稳定后才会设置

// 创建废液排出步骤
const createStandardWasteDisposalStep = (devices) => {
  // 将所有阀门设置到位置1（假设位置1是排放废液的位置）
  const commands = devices.valves.map(valve => ({
    deviceId: valve.id,
    deviceType: 'valve',
    action: 'setPosition',
    parameters: {
      position: 1 // 假设位置1是排放废液的位置
    }
  }));
  
  return {
    id: `step-${Date.now()}-waste`,
    name: '废液排出',
    description: '打开与废液收集相连的阀门，准备系统清洗',
    deviceCommands: commands,
    waitForCompletion: true,
    delayAfter: 0 // 不需要固定延迟，系统会自动基于设备状态判断
  };
};

// 🎯 Task界面标准：创建清洗准备步骤
const createStandardCleaningPreparationStep = (devices) => {
  const commands = [];
  const cleaningVolume = 100; // 清洗体积
  
  // 1. 只切换产品收集阀到6号孔位（确保整个路径流通）
  const productValve = devices.valves.find(valve => valve.parameters.isProductValve);
  if (productValve) {
    commands.push({
      deviceId: productValve.id,
      deviceType: 'valve',
      action: 'setPort',
      parameters: { port: 6 } // 产品收集阀切换到6号孔位
    });
  }
  
  // 2. 准备系统清洗：泵设置端口、速度和吸取清洗液
  devices.pumps.forEach(pump => {
    // 设置泵端口到清洗液位置（使用端口5）
    commands.push({
      deviceId: pump.id,
      deviceType: 'pump',
      action: 'setPort',
      parameters: { port: 5 } // 端口5连接清洗液
    });
    
    // 设置清洗速度
    if (pump.parameters.speed !== undefined) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setSpeed',
        parameters: { speed: pump.parameters.speed }
      });
    }
    
    // 吸取清洗液
    commands.push({
      deviceId: pump.id,
      deviceType: 'pump',
      action: 'setPosition',
      parameters: { position: cleaningVolume }
    });
  });
  
  return {
    id: `step-${Date.now()}-prep-cleaning`,
    name: '清洗准备',
    description: `将产品收集阀切换到6号孔位，从端口5吸取${cleaningVolume}μL清洗液`,
    deviceCommands: commands,
    waitForCompletion: true,
    delayAfter: 0
  };
};

// 创建系统清洗步骤
const createStandardCleaningExecutionStep = (devices) => {
  const commands = [];
  const cleaningCycles = 2; // 默认清洗2个循环
  const cleaningVolume = 100; // 默认100μL清洗液
  
  // 为每个清洗循环创建命令
  for (let cycle = 1; cycle <= cleaningCycles; cycle++) {
    devices.pumps.forEach(pump => {
      // 设置泵端口到清洗液位置（使用吸取端口或默认端口1）
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: {
          port: 1 // 固定使用端口1作为清洗液
        }
      });
      
      // 抽吸清洗液
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'aspirate',
        parameters: {
          volume: cleaningVolume
        }
      });
      
      // 设置泵端口到废液位置
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: {
          port: 6 // 固定使用端口6作为废液位置
        }
      });
      
      // 排出清洗液
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'dispense',
        parameters: {
          volume: cleaningVolume * 0.95 // 排出95%确保充分排空
        }
      });
    });
  }
  
  // 关闭加热器
  devices.heaters.forEach(heater => {
    commands.push({
      deviceId: heater.id,
      deviceType: 'chip',
      action: 'setTemp',
      parameters: {
        temperature: 25, // 回到室温
        speed: 5 // 低速冷却
      }
    });
  });
  
  return {
    id: `step-${Date.now()}-cleaning`,
    name: '系统清洗',
    description: `执行${cleaningCycles}次清洗循环，确保管路清洁，并关闭加热器`,
    deviceCommands: commands,
    waitForCompletion: true,
    delayAfter: 0 // 不需要固定延迟，系统会自动基于设备状态判断
  };
};

// 发送所有待发送的参数变更
const sendAllParameterChanges = async () => {
  if (pendingChanges.value.size === 0 || isCommandSending.value) {
    return false;
  }
  
  isCommandSending.value = true;
  
  try {
    const updateCommands = [];
    
    // 遍历所有待更新的设备
    for (const [deviceKey, changes] of pendingChanges.value.entries()) {
      // 从键中获取设备类型
      const [deviceType, deviceId] = deviceKey.split('_');
      
      if (!changes.params || Object.keys(changes.params).length === 0) {
        console.error(`跳过设备 ${deviceKey} 的参数更新：没有更改`);
        continue;
      }
      
      // 根据设备类型构建不同的命令
      switch (deviceType) {
        case 'pump': {
          const port =
            changes.params.aspiratePort ?? changes.params.dispensePort ?? undefined;
          updateCommands.push({
            id: deviceId,
            type: 'pump',
            action: 'updateParameters',
            parameters: {
              ...(changes.params.setSpeed !== undefined && { speed: changes.params.setSpeed }),
              ...(changes.params.position !== undefined && { position: changes.params.position }),
              ...(port !== undefined && { port })
            }
          });
          break;
        }
          
        case 'valve':
          updateCommands.push({
            id: deviceId,
            type: 'valve',
            action: 'setPosition',
            parameters: {
              position: changes.params.position,
              port: changes.params.position
            }
          });
          break;
          
        case 'chip':
          updateCommands.push({
            id: deviceId,
            type: 'chip',
            action: 'setTemp',
            parameters: {
              ...(changes.params.setTemp !== undefined && { temperature: changes.params.setTemp }),
              ...(changes.params.speed !== undefined && { speed: changes.params.speed })
            }
          });
          break;
        case 'mfc':
          updateCommands.push({
            id: deviceId,
            type: 'mfc',
            action: 'setFlowRate',
            parameters: { flowRate: changes.params.setFlowRate }
          });
          break;
        case 'light':
          updateCommands.push({
            id: deviceId,
            type: 'light',
            action: 'setIntensity',
            parameters: { intensity: changes.params.setIntensity }
          });
          break;
        default:
          console.warn(`未知的设备类型: ${deviceType}`);
          break;
      }
    }
    
    // 如果有命令需要发送
    if (updateCommands.length > 0) {
      if (wsConnected.value) {
        // 判断是否已连接硬件
        if (!isHardwareConnected.value) {
          errorMessage.value = "硬件未连接，无法发送命令";
          isCommandSending.value = false;
          return false;
        }
        
        // 通过WebSocket发送
        sendWsMessage({
          type: 'updateDeviceParameters',
          payload: updateCommands
        });
        
        // 清空待发送变更
        pendingChanges.value.clear();
        
        // 显示成功消息
        if (updateCommands.length === 1) {
          console.log(`已发送 ${updateCommands[0].id} 的参数更新`);
        } else {
          console.log(`已发送 ${updateCommands.length} 个设备的参数更新`);
        }
      } else {
        console.log("未连接到服务器，无法发送参数更新");
        errorMessage.value = "未连接到服务器，无法发送参数更新";
        isCommandSending.value = false;
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("发送参数更新失败:", error);
    errorMessage.value = `发送参数更新失败: ${error.message}`;
    return false;
  } finally {
    isCommandSending.value = false;
  }
};

// 翻译设备状态为中文
const translateStatus = (status) => {
  const statusMap = {
    running: '运行中',
    stopped: '已停止',
    idle: '空闲',
    open: '已打开',
    closed: '已关闭',
    heating: '加热中',
    cooling: '冷却中',
    on: '已开启',
    off: '已关闭',
    error: '错误'
  };
  
  return statusMap[status] || status;
};

// 🔧 断开WebSocket连接 - 使用共享连接管理器
const disconnectWebSocket = () => {
  topControlWsManager.disconnect();
};

// 🔧 尝试重新连接WebSocket - 使用共享连接管理器
const reconnectWebSocket = () => {
  console.log("用户手动重新连接WebSocket");
  errorMessage.value = '';
  connectWebSocket();
};

// 更新图中的设备节点
const updateDeviceOnGraph = (device) => {
  if (!graph) return;
  
  // 更新节点外观
  updateNodeAppearance(device.id, device.status);
  
  // 如果是当前选中的设备，更新控制面板数据
  if (device.id === selectedDevice.value) {
    deviceData.value = device;
  }
};

// 全局设备仓库
const globalDevices = ref(new Map()); // 存储所有已连接的实际设备
const showDeviceSelectionDialog = ref(false); // 是否显示设备选择对话框
const deviceSearchQuery = ref(''); // 设备搜索查询
const filteredDevicesCache = ref([]); // 过滤后的设备缓存

// 根据类型筛选的设备列表
const filteredDevices = computed(() => {
  return filteredDevicesCache.value;
});

// 设备分组
const deviceGroups = computed(() => {
  // 先按模块名称分组
  const moduleGroups = {};
  
  // 对已过滤的设备进行分组
  filteredDevices.value.forEach(device => {
    // 判断设备是否有模块数据
    if (device.moduleMetadata && device.moduleMetadata.moduleName) {
      const moduleName = device.moduleMetadata.moduleName;
      if (!moduleGroups[moduleName]) {
        moduleGroups[moduleName] = [];
      }
      moduleGroups[moduleName].push(device);
    } else {
      // 没有模块数据的设备，按控制器分组
      const groupId = `控制器 ${device.controllerIndex || 1}`;
      if (!moduleGroups[groupId]) {
        moduleGroups[groupId] = [];
      }
      moduleGroups[groupId].push(device);
    }
  });
  
  // 转换为数组形式
  return Object.keys(moduleGroups).map(moduleName => {
    return {
      title: moduleName,
      devices: moduleGroups[moduleName]
    };
  });
});

// 过滤设备
const filterDevices = () => {
  const query = deviceSearchQuery.value.toLowerCase();
  const type = dropPosition.value.type;
  
  // 先按类型过滤
  let devices = Array.from(globalDevices.value.values())
    .filter(device => device.type === type);
  
  // 再按搜索词过滤
  if (query) {
    devices = devices.filter(device => 
      device.id.toLowerCase().includes(query)
    );
  }
  
  // 过滤掉当前图中已存在的设备
  devices = devices.filter(device => {
    return !graph?.getNodeData().some(node => node.id === device.id);
  });
  
  // 更新缓存
  filteredDevicesCache.value = devices;
};

// 获取设备类型名称
const getDeviceTypeName = (type) => {
  const typeNames = {
    pump: "泵",
    valve: "阀",
    chip: "加热芯片",
    mfc: "MFC控制器",
    light: "光照控制",
    bottle: "瓶"
  };
  return typeNames[type] || type;
};

const isCommandSending = ref(false);

// 翻译设备类型为中文 - 与Task界面保持完全一致
const translateDeviceType = (type) => {
  const typeMap = {
    'pump': '泵',
    'valve': '阀门',
    'chip': '芯片',
    'heater': '加热器',
    'mfc': '质量流量计',
    'light': '光源',
    'bottle': '试剂瓶'
  };
  
  return typeMap[type] || type;
};

// 翻译参数名称
const translateParameterName = (param, deviceType) => {
  // 根据设备类型和参数名组合判断
  if (deviceType === 'Pump' && param === 'position') {
    return '位置';
  } else if (deviceType === 'Valve' && param === 'port') {
    return '孔位';
  } else if (deviceType === 'Valve' && param === 'position') {
    return '孔位'; // 兼容旧版本
  }
  
  const paramMap = {
    // 泵参数
    speed: '速度',
    position: '位置', // 泵的位置参数
    port: '孔位', // 阀门的孔位参数
    initialize: '初始化',
    stop: '停止',
    
    // 加热芯片参数
    speed: '加热速度',
    setTemp: '设置温度',
    
    // MFC参数
    setFlowRate: '设置流速',
    
    // 光照控制参数
    setIntensity: '设置光强',
  };
  
  return paramMap[param] || param;
};

// 选择设备
const selectDevice = (deviceId) => {
  console.log('选择设备:', deviceId);
  
  // 更新选中的设备
  selectedDevice.value = deviceId;
  
  // 从全局设备仓库获取最新设备数据
  if (globalDevices.value.has(deviceId)) {
    // 深拷贝确保控制面板数据独立
    const device = globalDevices.value.get(deviceId);
    const deviceCopy = JSON.parse(JSON.stringify(device));
    
    // 如果有待发送的参数变更，优先显示这些变更值
    const deviceType = device.type;
    const deviceKey = `${deviceType}_${deviceId}`;
    
    if (pendingChanges.value.has(deviceKey)) {
      const pendingParams = pendingChanges.value.get(deviceKey).params;
      // 合并待发送的参数变更
      Object.assign(deviceCopy, pendingParams);
    }
    
    deviceData.value = deviceCopy;
    
    // 初始化控制参数对象
    controlParams.value = {};
    
    // 根据设备类型设置默认控制参数
    if (deviceType === 'pump') {
      // 初始化泵的吸取和输送端口参数
      controlParams.value.aspiratePort = deviceCopy.aspiratePort || 1;
      controlParams.value.dispensePort = deviceCopy.dispensePort || 6;
      controlParams.value.speed = deviceCopy.speed || 0;
      controlParams.value.position = deviceCopy.position || 0;
    } else if (deviceType === 'valve') {
      controlParams.value.port = deviceCopy.port || deviceCopy.position || 1; // 优先使用port，兼容旧版position
      controlParams.value.isProductValve = deviceCopy.isProductValve || false;
    } else if (deviceType === 'chip') {
      controlParams.value.targetTemp = deviceCopy.targetTemp || 25;
      controlParams.value.heatingSpeed = deviceCopy.heatingSpeed || 1;
    } else if (deviceType === 'mfc') {
      controlParams.value.flowRate = deviceCopy.flowRate || 0;
    } else if (deviceType === 'light') {
      controlParams.value.intensity = deviceCopy.intensity || 0;
    }
    
  } else {
    // 如果全局仓库中没有该设备数据，创建一个模拟数据
    console.log('没有该设备数据', deviceId);
  }
  
  // 显示控制面板
  showControlPanel.value = true;
};

// 创建新流程
const createNewWorkflow = () => {
  Object.assign(currentWorkflow, {
    id: '',
    name: '',
    description: '',
    steps: [],
    createdAt: null,
    updatedAt: null
  });
  
  selectedStepIndex.value = -1;
};


// 确认生成工作流
const confirmGenerateWorkflow = () => {
  // 创建一个新的工作流
  createNewWorkflow();
  
  // 设置工作流名称和描述
  currentWorkflow.name = `${selectedPath.value?.name || '未命名路径'} 标准工作流`;
  currentWorkflow.description = `基于反应路径 "${selectedPath.value?.name || '未命名路径'}" 自动生成的标准微流控工作流`;
  
  // 构建标准工作流步骤
  buildStandardWorkflowSteps();
  
  // 关闭参数配置对话框
  showStandardParamsDialog.value = false;
  
  // 打开工作流编辑器（如果当前不在工作流模式）
  if (!isWorkflowMode.value) {
    isWorkflowMode.value = true;
  }
  
  ElMessage.success('已成功生成标准微流控工作流');
};

// 构建标准工作流步骤 - 改进版
const buildStandardWorkflowSteps = () => {
  // 步骤1: 初始化反应路径 - 设置阀门和加热器
  addImprovedInitializationStep();
  
  // 步骤2: 泵润洗 - 排空泵至废液口
  addImprovedPumpRinseStep();
  
  // 步骤3: 抽吸反应溶液
  addImprovedReagentAspirationStep();
  
  // 步骤4: 反应运行
  addImprovedReactionRunStep();
  
  // 步骤5: 产品收集 - 打开与收集产品相连的阀门
  addImprovedProductCollectionStep();
  
  // 步骤6: 废液排出 - 打开与废液相连的阀门
  addImprovedWasteDisposalStep();
  
  // 步骤7: 系统清洗 - 抽吸清洁溶液并冲洗管道
  addImprovedSystemCleaningStep();
  
  // 为所有步骤修改：移除延迟参数并确保启用完成条件检查
  currentWorkflow.steps.forEach(step => {
    // 设置等待完成标志
    step.waitForCompletion = true;
    
    // 对每个设备命令启用自动生成完成条件
    step.deviceCommands.forEach(cmd => {
      cmd.generateCompletionCondition = true;
      
      // 设置合理的超时时间
      // 对于加热芯片设置更长的超时时间
      if (cmd.deviceType === 'chip' && cmd.action === 'setTemp') {
        cmd.completionTimeout = 300; // 5分钟
      } else if (cmd.deviceType === 'pump') {
        cmd.completionTimeout = 180; // 3分钟
      } else {
        cmd.completionTimeout = 60; // 1分钟
      }
    });
    
    // 仅保留少量延迟，主要依靠设备状态判断
    if (step.delayAfter > 20) {
      step.delayAfter = 5; // 大的延迟改为5秒
    } else if (step.delayAfter > 0) {
      step.delayAfter = Math.min(step.delayAfter, 3); // 小的延迟最多3秒
    }
  });
  
  console.log("已优化所有步骤，使用设备状态检测替代固定延迟");
};

// 步骤1: 初始化反应路径
const addImprovedInitializationStep = () => {
  const commands = [];
  
  // 1. 阀门初始化命令 (所有非产品/废液阀门)
  pathValves.value.forEach(valve => {
    // 跳过连接产品或废液的阀门
    if (!standardParams.valvesToProduct[valve.id] && !standardParams.valvesToWaste[valve.id]) {
      commands.push({
        deviceId: valve.id,
        deviceType: 'valve',
        action: 'setPort',
        parameters: {
          port: standardParams.valvePorts[valve.id]
        },
        generateCompletionCondition: true,
        completionTimeout: 30
      });
    }
  });
  
  // 2. 加热器初始化命令
  pathHeaters.value.forEach(heater => {
    if (standardParams.enabledHeaters[heater.id]) {
      commands.push({
        deviceId: heater.id,
        deviceType: 'chip',
        action: 'setTemp',
        parameters: {
          temperature: standardParams.heaterTemps[heater.id],
          speed: standardParams.heaterSpeeds[heater.id]
        },
        generateCompletionCondition: true,
        completionTimeout: 300 // 5分钟超时，加热需要较长时间
      });
    }
  });
  
  // 3. 泵初始化命令
  pathPumps.value.forEach(pump => {
    if (standardParams.enabledPumps[pump.id]) {
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'initialize',
        parameters: {},
        generateCompletionCondition: true,
        completionTimeout: 60 // 1分钟超时
      });
    }
  });
  
  // 添加步骤
  currentWorkflow.steps.push({
    id: `step-${Date.now()}-1`,
    name: '初始化反应路径',
    description: '设置阀门到初始孔位，启动加热器至目标温度，初始化所有泵',
    deviceCommands: commands,
    waitForCompletion: true,
    delayAfter: 10 // 10秒延迟确保初始化完成
  });
};

// 步骤2: 泵润洗
const addImprovedPumpRinseStep = () => {
  const commands = [];
  
  pathPumps.value.forEach(pump => {
    if (standardParams.enabledPumps[pump.id]) {
      // 设置泵端口到废液口
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: {
          aspiratePort: standardParams.pumpAspiratePorts[pump.id],
          dispensePort: 6 // 固定使用6号端口作为废液口
        },
        generateCompletionCondition: true,
        completionTimeout: 10
      });
      
      // 设置泵速度
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setSpeed',
        parameters: {
          speed: standardParams.pumpSpeeds[pump.id]
        },
        generateCompletionCondition: true,
        completionTimeout: 5
      });
      
      // 排空泵内溶液
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'empty',
        parameters: {},
        generateCompletionCondition: true,
        completionTimeout: 120 // 2分钟超时
      });
      
      // 设置泵端口到用户指定的输送端口
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: {
          aspiratePort: standardParams.pumpAspiratePorts[pump.id],
          dispensePort: standardParams.pumpDispensePorts[pump.id]
        },
        generateCompletionCondition: true,
        completionTimeout: 10
      });
    }
  });
  
  if (commands.length > 0) {
    // 添加设备状态检查条件
    const conditions = [];
    
    // 为每个泵添加一个位置接近零的检查条件
    pathPumps.value.forEach(pump => {
      if (standardParams.enabledPumps[pump.id]) {
        conditions.push({
          type: 'deviceParameter',
          deviceType: 'pump',
          deviceId: pump.id,
          parameter: 'position',
          comparison: 'lte', // 小于等于
          value: 10, // 位置接近0，允许10的误差
          timeout: 180 // 3分钟超时
        });
      }
    });
    
    currentWorkflow.steps.push({
      id: `step-${Date.now()}-2`,
      name: '泵润洗',
      description: '将泵排空至废液口进行润洗，清除可能存在的残留物',
      deviceCommands: commands,
      waitForCompletion: true,
      conditions: conditions.length > 0 ? conditions : undefined,
      delayAfter: 3 // 3秒短延迟确保系统稳定
    });
  }
};

// 步骤3: 抽吸反应溶液
const addImprovedReagentAspirationStep = () => {
  const commands = [];
  
  pathPumps.value.forEach(pump => {
    if (standardParams.enabledPumps[pump.id]) {
      // 设置泵端口到反应物端口
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: {
          aspiratePort: standardParams.pumpAspiratePorts[pump.id],
          dispensePort: standardParams.pumpDispensePorts[pump.id]
        },
        generateCompletionCondition: true,
        completionTimeout: 10
      });
      
      // 设置泵速度
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setSpeed',
        parameters: {
          speed: standardParams.pumpSpeeds[pump.id]
        },
        generateCompletionCondition: true,
        completionTimeout: 5
      });
      
      // 抽吸反应溶液
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'aspirate',
        parameters: {
          volume: standardParams.pumpVolumes[pump.id]
        },
        generateCompletionCondition: true,
        completionTimeout: 180 // 3分钟超时
      });
      
      // 如果设置了反应物，记录在备注中
      const reagentInfo = standardParams.pumpReagents[pump.id] 
        ? `${standardParams.pumpReagents[pump.id]}` 
        + (standardParams.pumpConcentrations[pump.id] ? ` (${standardParams.pumpConcentrations[pump.id]})` : '')
        : "反应溶液";
      
      commands[commands.length - 1].note = `抽吸 ${reagentInfo}`;
    }
  });
  
  if (commands.length > 0) {
    // 创建泵位置检查条件
    const positionConditions = [];
    
    // 为每个泵添加检查条件，确保体积已经抽吸到位
    pathPumps.value.forEach(pump => {
      if (standardParams.enabledPumps[pump.id]) {
        const targetVolume = standardParams.pumpVolumes[pump.id];
        positionConditions.push({
          type: 'deviceParameter',
          deviceType: 'pump',
          deviceId: pump.id,
          parameter: 'position',
          comparison: 'gte', // 大于等于
          value: targetVolume * 0.95, // 至少达到95%的目标体积
          timeout: 180 // 3分钟超时
        });
      }
    });
    
    currentWorkflow.steps.push({
      id: `step-${Date.now()}-3`,
      name: '抽吸反应溶液',
      description: '从指定端口抽取反应所需的溶液',
      deviceCommands: commands,
      waitForCompletion: true,
      conditions: positionConditions,
      delayAfter: 3 // 3秒短延迟
    });
  }
};

// 步骤4: 反应运行
const addImprovedReactionRunStep = () => {
  const commands = [];
  
  // 设置泵出液端口
  pathPumps.value.forEach(pump => {
    if (standardParams.enabledPumps[pump.id]) {
      // 设置出液端口
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setPort',
        parameters: {
          aspiratePort: standardParams.pumpAspiratePorts[pump.id],
          dispensePort: standardParams.pumpDispensePorts[pump.id]
        }
      });
      
      // 设置泵速度
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'setSpeed',
        parameters: {
          speed: standardParams.pumpSpeeds[pump.id]
        }
      });
      
      // 排出溶液到反应系统
      commands.push({
        deviceId: pump.id,
        deviceType: 'pump',
        action: 'dispense',
        parameters: {
          // 排出90%的体积，留10%确保不会吸入空气
          volume: standardParams.pumpVolumes[pump.id] * 0.9 
        },
        // 启用自动生成完成条件
        generateCompletionCondition: true,
        completionTimeout: 180 // 3分钟超时
      });
    }
  });
  
  // 添加反应时间等待步骤
  currentWorkflow.steps.push({
    id: `step-${Date.now()}-4`,
    name: '反应溶液输送',
    description: `将反应溶液输送到反应器中`,
    deviceCommands: commands,
    waitForCompletion: true,
    delayAfter: 3 // 3秒稳定等待
  });
  
  // 创建反应持续步骤
  const reactionCommands = [];
  // 可以添加轻微搅动或其他反应过程中需要的辅助命令
  
  // 温度监控条件
  const conditions = [];
  
  // 检查加热器是否达到目标温度
  pathHeaters.value.forEach(heater => {
    if (standardParams.enabledHeaters[heater.id]) {
      conditions.push({
        type: 'deviceParameter',
        deviceType: 'chip',
        deviceId: heater.id,
        parameter: 'currentTemp',
        comparison: 'gte', // 大于等于
        value: standardParams.heaterTemps[heater.id] * 0.95, // 允许5%的误差
        tolerance: 2, // 允许2度误差
        timeout: 300 // 5分钟超时
      });
    }
  });
  
  // 添加反应等待步骤
  currentWorkflow.steps.push({
    id: `step-${Date.now()}-4b`,
    name: '反应进行中',
    description: `反应溶液在加热条件下反应${standardParams.reactionTime}分钟`,
    deviceCommands: reactionCommands,
    waitForCompletion: true,
    // 使用温度条件和超时条件
    conditions: [
      ...conditions,
      {
        type: 'timeout',
        duration: standardParams.reactionTime * 60, // 转换为秒
        description: `反应持续${standardParams.reactionTime}分钟`
      }
    ],
    delayAfter: 0 // 无需额外延迟
  });
};

// 步骤5: 产品收集
const addImprovedProductCollectionStep = () => {
  const commands = [];
  
  // 找出标记为产品收集的阀门
  const productValves = pathValves.value.filter(valve => 
    standardParams.valvesToProduct[valve.id]
  );
  
  productValves.forEach(valve => {
    commands.push({
      deviceId: valve.id,
      deviceType: 'valve',
      action: 'setPort',
      parameters: {
        port: standardParams.valveProductPorts[valve.id] || 2
      },
      generateCompletionCondition: true,
      completionTimeout: 30 // 30秒超时
    });
  });
  
  if (commands.length > 0) {
    // 创建阀门位置检查条件
    const valveConditions = [];
    
    // 为每个阀门添加位置检查
    productValves.forEach(valve => {
      valveConditions.push({
        type: 'deviceParameter',
        deviceType: 'valve',
        deviceId: valve.id,
        parameter: 'port',
        comparison: 'eq',
        value: standardParams.valveProductPorts[valve.id] || 2,
        timeout: 30 // 30秒超时
      });
    });
    
    currentWorkflow.steps.push({
      id: `step-${Date.now()}-5`,
      name: '产品收集',
      description: '打开与产品收集相连的阀门，将合成产物导向收集容器',
      deviceCommands: commands,
      waitForCompletion: true,
      conditions: valveConditions,
      delayAfter: 3 // 减少延迟
    });
  } else {
    // 如果没有指定产品阀门，添加提示步骤
    currentWorkflow.steps.push({
      id: `step-${Date.now()}-5`,
      name: '产品收集',
      description: '注意：未设置产品收集阀门，请手动操作收集产品',
      deviceCommands: [],
      waitForCompletion: true,
      delayAfter: 5 // 减少延迟
    });
  }
};

// 步骤6: 废液排出
const addImprovedWasteDisposalStep = () => {
  const commands = [];
  
  // 找出标记为废液的阀门
  const wasteValves = pathValves.value.filter(valve => 
    standardParams.valvesToWaste[valve.id]
  );
  
  wasteValves.forEach(valve => {
    commands.push({
      deviceId: valve.id,
      deviceType: 'valve',
      action: 'setPort',
      parameters: {
        port: standardParams.valvePorts[valve.id] // 使用初始孔位
      },
      generateCompletionCondition: true,
      completionTimeout: 30 // 30秒超时
    });
  });
  
  if (commands.length > 0) {
    // 阀门位置检查条件
    const valveConditions = [];
    
    // 为每个阀门添加位置检查
    wasteValves.forEach(valve => {
      valveConditions.push({
        type: 'deviceParameter',
        deviceType: 'valve',
        deviceId: valve.id,
        parameter: 'port',
        comparison: 'eq',
        value: standardParams.valvePorts[valve.id],
        timeout: 30 // 30秒超时
      });
    });
    
    currentWorkflow.steps.push({
      id: `step-${Date.now()}-6`,
      name: '废液排出',
      description: '打开与废液收集相连的阀门，准备系统清洗',
      deviceCommands: commands,
      waitForCompletion: true,
      conditions: valveConditions,
      delayAfter: 3 // 3秒短延迟
    });
  }
};

// 步骤7: 系统清洗
const addImprovedSystemCleaningStep = () => {
  const commands = [];
  
  // 为每个清洗循环创建命令
  for (let cycle = 1; cycle <= standardParams.cleaningCycles; cycle++) {
    pathPumps.value.forEach(pump => {
      if (standardParams.enabledPumps[pump.id]) {
        // 设置泵端口到清洗液位置
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'setPort',
          parameters: {
            aspiratePort: 1, // 固定使用1号端口作为清洗液端口
            dispensePort: 6 // 固定使用6号端口作为废液口
          },
          generateCompletionCondition: true,
          completionTimeout: 10,
          note: `清洗循环 ${cycle}/${standardParams.cleaningCycles}: 设置端口`
        });
        
        // 抽吸清洗液
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'aspirate',
          parameters: {
            volume: standardParams.cleaningVolume
          },
          generateCompletionCondition: true,
          completionTimeout: 60,
          note: `清洗循环 ${cycle}/${standardParams.cleaningCycles}: 抽吸清洗液`
        });
        
        // 设置泵端口到废液位置
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'setPort',
          parameters: {
            aspiratePort: standardParams.pumpAspiratePorts[pump.id],
            dispensePort: 6 // 固定使用6号端口作为废液口
          },
          generateCompletionCondition: true,
          completionTimeout: 10,
          note: `清洗循环 ${cycle}/${standardParams.cleaningCycles}: 设置废液端口`
        });
        
        // 排出清洗液
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'dispense',
          parameters: {
            volume: standardParams.cleaningVolume * 0.95 // 排出95%确保充分排空
          },
          generateCompletionCondition: true,
          completionTimeout: 60,
          note: `清洗循环 ${cycle}/${standardParams.cleaningCycles}: 排出清洗液`
        });
      }
    });
  }
  
  // 最后关闭加热器
  pathHeaters.value.forEach(heater => {
    if (standardParams.enabledHeaters[heater.id]) {
      commands.push({
        deviceId: heater.id,
        deviceType: 'chip',
        action: 'setTemp',
        parameters: {
          temperature: 25, // 回到室温
          speed: 5 // 低速冷却
        },
        generateCompletionCondition: true,
        completionTimeout: 180 // 3分钟超时，冷却过程较慢
      });
    }
  });
  
  // 创建条件检查
  const cleaningConditions = [];
  
  // 添加泵位置检查（所有泵应该接近空）
  pathPumps.value.forEach(pump => {
    if (standardParams.enabledPumps[pump.id]) {
      cleaningConditions.push({
        type: 'deviceParameter',
        deviceType: 'pump',
        deviceId: pump.id,
        parameter: 'position',
        comparison: 'lte', // 小于等于
        value: 10, // 位置接近0，表示排空
        timeout: 180 // 3分钟超时
      });
    }
  });
  
  // 添加温度检查条件（加热器应冷却到接近室温）
  pathHeaters.value.forEach(heater => {
    if (standardParams.enabledHeaters[heater.id]) {
      cleaningConditions.push({
        type: 'deviceParameter',
        deviceType: 'chip',
        deviceId: heater.id,
        parameter: 'currentTemp',
        comparison: 'lte', // 小于等于
        value: 35, // 低于35度即可
        timeout: 300 // 5分钟超时
      });
    }
  });
  
  currentWorkflow.steps.push({
    id: `step-${Date.now()}-7`,
    name: '系统清洗',
    description: `执行 ${standardParams.cleaningCycles} 次清洗循环，确保管路清洁，并关闭加热器`,
    deviceCommands: commands,
    waitForCompletion: true,
    conditions: cleaningConditions,
    delayAfter: 3 // 减少固定延迟
  });
};
// 暂停或继续流程
const pauseOrResumeWorkflow = () => {
  if (workflowExecutor.status === 'running') {
    workflowExecutor.pauseWorkflow();
    ElMessage.info('流程已暂停');
  } else if (workflowExecutor.status === 'paused') {
    workflowExecutor.resumeWorkflow();
    ElMessage.success('流程已继续执行');
  }
};

// 停止流程
const stopWorkflow = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要终止当前流程吗？此操作不可恢复。',
      '终止确认',
      {
        confirmButtonText: '终止',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 用户确认终止
    workflowExecutor.stopWorkflow();
    ElMessage.warning('流程已终止');
    
    // 重置UI状态
    setTimeout(() => {
      isRunningWorkflow.value = false;
    }, 1000);
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('终止流程失败:', error);
      ElMessage.error(`终止失败: ${error.message}`);
    }
  }
};
// 计算执行进度百分比
const calculateProgress = () => {
  if (!currentWorkflow || !currentWorkflow.steps || currentWorkflow.steps.length === 0) {
    return 0;
  }
  
  return Math.round((workflowExecutor.activeStepIndex / currentWorkflow.steps.length) * 100);
};

// 获取进度状态
const getProgressStatus = () => {
  switch (workflowExecutor.status) {
    case 'completed':
      return 'success';
    case 'error':
      return 'exception';
    case 'paused':
      return 'warning';
    default:
      return '';
  }
};
// 翻译执行状态
const translateExecutionStatus = (status) => {
  const statusMap = {
    'idle': '空闲',
    'running': '运行中',
    'paused': '已暂停',
    'completed': '已完成',
    'error': '出错'
  };
  
  return statusMap[status] || status;
};

// 反应路径选择面板 - 新增
const isShowingReactionPath = ref(false);
const selectedReactionPathIndex = ref(null);

// 反应路径示例数据 - 修改为从graph_mapping.json加载
const reactionPaths = ref([]);
// 添加反应路径加载状态和错误信息
const isLoadingReactionPaths = ref(false);
const reactionPathsError = ref('');

// 加载反应路径数据
const loadMappingData = async () => {
  try {
    isLoadingReactionPaths.value = true;
    reactionPathsError.value = '';
    
    // 🎯 在编辑模式下，不加载默认路径，而是等待从task传递的数据
    if (isEditMode.value) {
      console.log('✅ 编辑模式：等待从task传递反应路径数据');
      return;
    }
    
    // 🎯 双重检查：如果有编辑数据，也不清空反应路径
    if (editTaskData.value) {
      console.log('✅ 检测到编辑数据：保持现有反应路径数据');
      return;
    }
    
    // 非编辑模式下，清空反应路径数据，不使用默认模拟数据
    console.log('✅ 非编辑模式：清空反应路径数据，不使用模拟数据');
    reactionPaths.value = [];
  } catch (error) {
    console.error('加载反应路径数据失败:', error);
    reactionPathsError.value = `加载反应路径数据失败: ${error.message}`;
  } finally {
    isLoadingReactionPaths.value = false;
  }
};

// 🎯 删除默认反应路径数据，改为从task数据创建反应路径
const createReactionPathFromTaskData = (taskData) => {
  if (!taskData) {
    console.warn('缺少task数据，无法创建反应路径');
    return null;
  }
  
  console.log('🔧 createReactionPathFromTaskData 输入数据:', taskData);
  
  let pathDevices = [];
  
  // 🔧 修复：优先使用Queue Result中的pathDevices
  if (taskData.queueResult && taskData.queueResult.pathDevices && Array.isArray(taskData.queueResult.pathDevices)) {
    pathDevices = taskData.queueResult.pathDevices;
    console.log('✅ 使用queueResult.pathDevices:', pathDevices);
  }
  // 向后兼容：使用matchedPath
  else if (taskData.matchedPath && Array.isArray(taskData.matchedPath)) {
    pathDevices = taskData.matchedPath;
    console.log('✅ 使用matchedPath:', pathDevices);
  }
  // 向后兼容：使用devicePath
  else if (taskData.devicePath && Array.isArray(taskData.devicePath)) {
    pathDevices = taskData.devicePath;
    console.log('✅ 使用devicePath:', pathDevices);
  }
  else {
    console.warn('无法找到路径设备数据，检查以下字段:');
    console.warn('- queueResult.pathDevices:', taskData.queueResult?.pathDevices);
    console.warn('- matchedPath:', taskData.matchedPath);
    console.warn('- devicePath:', taskData.devicePath);
    return null;
  }
  
  if (pathDevices.length === 0) {
    console.warn('路径设备列表为空，无法创建反应路径');
    return null;
  }
  
  const reactionPath = {
    id: `task-path-${taskData.taskId}-${taskData.taskKey}`,
    name: `${taskData.taskName} (${taskData.taskKey})`,
    description: `产物: ${taskData.product || '未知产物'} | 反应时间: ${taskData.reactTime || 0}h | 调度时间: ${taskData.scheduledTime || '未指定'}`,
    nodes: pathDevices,
    edges: [], // 边数据将在图形加载后自动计算
            color: '#faad14' // 使用黄色作为编辑模式的反应路径颜色
  };
  
  console.log('✅ 从task数据创建反应路径:', reactionPath);
  console.log('✅ 反应路径包含设备:', pathDevices);
  return reactionPath;
};

// 切换反应路径面板显示状态
const toggleReactionPathPanel = () => {
  isShowingReactionPath.value = !isShowingReactionPath.value;
  
  if (isShowingReactionPath.value) {
    // 🎯 在编辑模式下，如果反应路径为空，从task数据创建反应路径
    console.log('🔍 toggleReactionPathPanel: 检查反应路径状态');
    console.log('🔍 反应路径数量:', reactionPaths.value.length);
    console.log('🔍 编辑模式:', isEditMode.value);
    console.log('🔍 编辑数据:', editTaskData.value);
    
    if (reactionPaths.value.length === 0) {
      if (isEditMode.value && editTaskData.value) {
        console.log('✅ 编辑模式：尝试从task数据创建反应路径');
        const taskReactionPath = createReactionPathFromTaskData(editTaskData.value);
        if (taskReactionPath) {
          reactionPaths.value = [taskReactionPath];
          selectedReactionPathIndex.value = 0;
          console.log('✅ 编辑模式：已从task数据创建反应路径', taskReactionPath);
        } else {
          console.error('❌ 编辑模式：无法从task数据创建反应路径');
        }
      } else {
        // 非编辑模式下不加载任何默认数据
        console.log('❌ 非编辑模式：无反应路径数据可显示');
        console.log('❌ isEditMode:', isEditMode.value);
        console.log('❌ editTaskData:', editTaskData.value);
        ElMessage.info('当前没有可用的反应路径数据');
      }
    } else {
      console.log('✅ 反应路径已存在，数量:', reactionPaths.value.length);
    }
    
    // 更新反应路径数据
    if (graph && graph.getNodeData().length > 0) {
      updateReactionPathEdges();
    } else {
      console.log("图表尚未初始化或没有节点数据，等待硬件结构加载");
      ElMessage.info('请先选择硬件结构，以便查看反应路径');
    }
  } else {
    // 关闭面板时重置选择
    clearReactionPathHighlight();
  }
};

// 修改反应路径面板的模板，添加加载状态和错误信息
const updateReactionPathPanel = () => {
  // 这里可以动态更新反应路径面板的内容
  // 由于Vue的响应式特性，只需更新reactionPaths.value即可
  console.log('反应路径面板已更新');
};

// 添加hardwareLoaded事件处理函数，在硬件结构加载后主动更新反应路径
const onHardwareStructureLoaded = () => {
  // 延迟执行，确保图表渲染完成
  setTimeout(() => {
    if (graph && graph.getNodeData().length > 0) {
      console.log("硬件结构已加载，更新反应路径数据");
      
      // 🎯 在编辑模式下，从task数据创建反应路径
      if (isEditMode.value && editTaskData.value) {
        console.log('✅ onHardwareStructureLoaded: 编辑模式处理');
        console.log('✅ 当前反应路径数量:', reactionPaths.value.length);
        
        if (reactionPaths.value.length === 0) {
          const taskReactionPath = createReactionPathFromTaskData(editTaskData.value);
          if (taskReactionPath) {
            reactionPaths.value = [taskReactionPath];
            selectedReactionPathIndex.value = 0;
            console.log('✅ 硬件结构加载后：已从task数据创建反应路径', taskReactionPath);
          }
        } else {
          console.log('✅ 反应路径已存在，更新边数据');
        }
      } else {
        console.log('❌ 非编辑模式或缺少编辑数据');
        console.log('❌ isEditMode:', isEditMode.value);
        console.log('❌ editTaskData:', editTaskData.value);
      }
      
      // 更新反应路径边数据
      if (reactionPaths.value.length > 0) {
        updateReactionPathEdges();
      }
      
      // 如果反应路径面板已打开并选择了路径，重新应用高亮
      if (isShowingReactionPath.value && selectedReactionPathIndex.value !== null) {
        selectReactionPath(selectedReactionPathIndex.value);
      }
    }
  }, 500);
};

// 🎯 已移除parseEditDataFromUrl函数，只使用postMessage模式

// 根据设备类型获取默认参数
const getDefaultParametersForDevice = (deviceId) => {
  // 从设备ID提取类型 (例如 "pump-1" -> "pump")
  const deviceType = deviceId.split('-')[0];
  
  switch (deviceType) {
    case 'pump':
      return {
        speed: 100,  // 默认速度
        flowRate: 5.0,  // 默认流速
        direction: 'forward'  // 默认方向
      };
    case 'valve':
      return {
        position: 1  // 默认位置
      };
    case 'chip':
      return {
        temperature: 25.0,  // 默认温度 (摄氏度)
        heatingRate: 5.0  // 默认加热速率
      };
    case 'mfc':
      return {
        flowRate: 10.0  // 默认气体流速
      };
    case 'bottle':
      return {
        volume: 100.0  // 默认容量 (mL)
      };
    default:
      return {};
  }
};

// 添加保存参数并返回任务界面的方法
const saveParametersAndReturn = () => {
  if (!isEditMode.value || !editTaskData.value) {
    ElMessage.warning('未处于编辑模式或缺少任务数据');
    return;
  }
  
  try {
    // 🔧 修复：只保存用户实际修改过的参数，而不是所有初始化的参数
    const taskParameters = {};
    const originalDefaultParams = {}; // 记录原始默认参数
    
    console.log('🔧 开始分析设备参数修改情况:', deviceParameters.value);
    
    // 遍历deviceParameters，只保存修改过的参数
    for (const [deviceKey, deviceInfo] of Object.entries(deviceParameters.value)) {
      // 跳过reactTime，它不是设备参数
      if (deviceKey === 'reactTime') continue;
      
      console.log('🔍 检查设备:', deviceKey, deviceInfo);
      
      if (!deviceInfo || !deviceInfo.parameters) {
        console.log('⚠️ 设备无参数，跳过:', deviceKey);
        continue;
      }
      
      // 🔧 修复：deviceKey就是完整的设备ID，不需要再次格式化
      const deviceId = deviceKey; // 原始设备ID，如 "pump-1", "valve-2"
      const deviceType = deviceId.split('-')[0]; // 提取设备类型，如 "pump", "valve"
      
      // 获取该设备的默认参数，用于对比
      const defaultParams = getDefaultParametersForDevice(deviceId);
      originalDefaultParams[deviceKey] = defaultParams;
      
      // 🔧 检查参数是否被用户修改过（与默认值不同）
      const currentParams = deviceInfo.parameters;
      const modifiedParams = {};
      let hasModifications = false;
      
      for (const [paramName, paramValue] of Object.entries(currentParams)) {
        const defaultValue = defaultParams[paramName];
        
        // 比较当前值与默认值
        if (paramValue !== defaultValue) {
          modifiedParams[paramName] = paramValue;
          hasModifications = true;
          console.log(`✅ 发现修改参数: ${deviceKey}.${paramName} = ${paramValue} (默认: ${defaultValue})`);
        } else {
          console.log(`⚪ 参数未修改: ${deviceKey}.${paramName} = ${paramValue} (默认值)`);
        }
      }
      
      // 只有当设备参数确实被修改过时才保存
      if (hasModifications) {
        // 🔧 修复：使用标准格式 deviceType_实际ID 作为键
        // 从 "pump-1" 提取为 type="pump", id="1"
        const deviceIdParts = deviceId.split('-');
        const actualDeviceId = deviceIdParts.slice(1).join('-'); // 支持多段ID
        const unifiedDeviceKey = `${deviceType}_${actualDeviceId}`;
        
        taskParameters[unifiedDeviceKey] = {
          type: deviceType,
          parameters: modifiedParams // 只保存修改过的参数
        };
        
        console.log('✅ 保存修改过的设备参数:', {
          原始设备键: deviceKey,
          设备类型: deviceType,
          实际设备ID: actualDeviceId,
          统一设备键: unifiedDeviceKey,
          修改的参数: modifiedParams
        });
      } else {
        console.log('⚪ 设备参数未修改，跳过保存:', deviceKey);
      }
    }
    
    // 🔧 如果没有任何参数修改，提示用户
    if (Object.keys(taskParameters).length === 0) {
      ElMessage.info('没有检测到参数修改，无需保存');
      console.log('ℹ️ 没有参数修改，原始默认参数:', originalDefaultParams);
      return;
    }
    
    // 创建要返回的参数对象
    const returnData = {
      taskId: editTaskData.value.taskId,
      taskKey: editTaskData.value.taskKey,
      matchIndex: editTaskData.value.matchIndex,
      parameters: taskParameters,
      reactTime: deviceParameters.value.reactTime || editTaskData.value.reactTime,
      // 🔧 添加参数修改的统计信息
      modifiedDevicesCount: Object.keys(taskParameters).length,
      totalDevicesCount: Object.keys(deviceParameters.value).filter(key => key !== 'reactTime').length,
      // 添加保存来源标识
      savedFromDirect: true,
      savedAt: new Date().toISOString()
    };
    
    console.log('📤 准备发送参数数据:', returnData);
    console.log('📊 参数修改统计:', {
      修改的设备数: returnData.modifiedDevicesCount,
      总设备数: returnData.totalDevicesCount,
      修改的参数: taskParameters
    });
    
    // 直接使用postMessage发送数据给父窗口
    window.parent.postMessage({
      type: 'TASK_EDIT_RETURN',
      data: JSON.stringify(returnData)
    }, '*');  // 在生产环境中应该限制目标源
    
    // 显示成功消息
    ElMessage.success(`参数已保存！共修改了 ${returnData.modifiedDevicesCount} 个设备的参数`);
    
    // 延迟关闭当前iframe
    setTimeout(() => {
      // 告诉父窗口关闭iframe
      window.parent.postMessage({
        type: 'CLOSE_EDIT_DIALOG',
        success: true
      }, '*');
    }, 1500); // 稍微延长一点时间，让用户看到成功消息
  } catch (error) {
    console.error('保存参数失败:', error);
    ElMessage.error(`保存参数失败: ${error.message}`);
  }
};

// 取消编辑并返回
const cancelEditAndReturn = () => {
  // 发送取消消息给父窗口
  window.parent.postMessage({
    type: 'TASK_EDIT_CANCEL'
  }, '*');
  
  // 显示消息
  ElMessage.info('已取消编辑');
};

// 🎯 从工作流界面保存任务参数
const saveTaskParametersFromWorkflow = async () => {
  if (!isEditMode.value || !editTaskData.value) {
    ElMessage.warning('未处于编辑模式或缺少任务数据');
    return;
  }
  
  if (!pendingChanges.value || pendingChanges.value.size === 0) {
    ElMessage.warning('没有待保存的参数更改');
    return;
  }
  
  try {
    // 将pendingChanges转换为任务参数格式
    const taskParameters = {};
    
    // 遍历所有待更改的设备参数
    for (const [deviceKey, changes] of pendingChanges.value.entries()) {
      const [deviceType, deviceId] = deviceKey.split('_');
      
      if (!changes.params || Object.keys(changes.params).length === 0) {
        continue;
      }
      
      // 为每个设备创建参数对象
      taskParameters[deviceId] = {
        id: deviceId,
        type: deviceType,
        parameters: { ...changes.params }
      };
    }
    
    // 创建要返回的参数对象
    const returnData = {
      taskId: editTaskData.value.taskId,
      taskKey: editTaskData.value.taskKey,
      matchIndex: editTaskData.value.matchIndex,
      parameters: taskParameters,
      reactTime: editTaskData.value.reactTime,
      // 添加工作流相关信息
      workflowGenerated: true,
      workflowName: previewWorkflow.value?.name,
      workflowSteps: previewWorkflow.value?.steps?.length || 0,
      savedFromWorkflow: true,
      savedAt: new Date().toISOString()
    };
    
    console.log('从工作流界面保存任务参数:', returnData);
    
    // 通过postMessage发送数据给父窗口
    window.parent.postMessage({
      type: 'TASK_EDIT_RETURN',
      data: JSON.stringify(returnData)
    }, '*');
    
    // 显示成功消息
    ElMessage.success('任务参数已保存！可以继续执行工作流或返回任务界面');
    
    // 可选：保持pendingChanges，让用户可以继续执行工作流
    // 如果想清空，可以取消注释下面的代码：
    // pendingChanges.value.clear();
    // showPendingChangesPanel.value = false;
    
  } catch (error) {
    console.error('保存任务参数失败:', error);
    ElMessage.error(`保存任务参数失败: ${error.message}`);
  }
};

// 🎯 已移除loadEditPathData函数，只使用postMessage模式创建反应路径

// 添加打开设备参数面板的方法
const openDeviceParameterPanel = (deviceId) => {
  // 检查设备是否在参数列表中
  if (!deviceParameters.value[deviceId]) {
    deviceParameters.value[deviceId] = {
      id: deviceId,
      parameters: getDefaultParametersForDevice(deviceId)
    };
  }
  
  // 显示设备参数设置面板
  // 这里可以使用现有的设备控制面板逻辑，只需修改为编辑参数模式
  showDeviceParameterEditPanel(deviceId);
};



// 翻译参数名称 - 与Task界面保持一致
const translateParamName = (paramName) => {
  const nameMap = {
    'speed': '速度',
    'position': '位置',
    'aspiratePort': '吸取端口',
    'dispensePort': '输送端口',
    'temperature': '温度',
    'currentTemp': '当前温度',
    'targetTemp': '目标温度',
    'setTemp': '设置温度',
    'flowRate': '流速',
    'intensity': '光强',
    'duration': '持续时间',
    'timeout': '超时时间',
    'value': '数值',
    'volume': '体积',
    'port': '端口'
  };
  
  return nameMap[paramName] || paramName;
};

// 获取参数单位 - 与Task界面保持一致
const getParameterUnit = (parameter) => {
  const unitMap = {
    'temperature': '°C',
    'currentTemp': '°C',
    'targetTemp': '°C',
    'setTemp': '°C',
    'speed': 'rpm',
    'flowRate': 'mL/min',
    'position': 'μL',
    'volume': 'μL',
    'port': '',
    'intensity': '%',
    'pressure': 'Pa'
  };
  return unitMap[parameter] || '';
};

// 翻译命令动作名称 - 与Task界面保持完全一致
const translateActionName = (action, deviceType) => {
  const actionMap = {
    'setPosition': '设置位置',
    'setTemp': '设置温度',
    'setSpeed': '设置速度',
    'setPort': '设置端口',
    'aspirate': '吸取',
    'dispense': '排出',
    'empty': '排空',
    'setFlowRate': '设置流量',
    'setIntensity': '设置强度',
    'start': '启动',
    'stop': '停止'
  };
  
  return actionMap[action] || action;
};

// 翻译条件类型
const translateConditionType = (type) => {
  const typeMap = {
    'deviceStatus': '设备状态',
    'timeout': '等待时间',
    'sensorValue': '传感器值'
  };
  
  return typeMap[type] || type;
};
// 显示设备参数编辑面板
const showDeviceParameterEditPanel = (deviceId) => {
  // 获取设备数据
  const device = graph.findById(deviceId);
  if (!device) {
    ElMessage.warning(`找不到设备: ${deviceId}`);
    return;
  }
  
  const model = device.getModel();
  
  // 设置当前设备数据
  deviceData.value = {
    id: deviceId,
    type: getDeviceTypeFromId(deviceId),
    // 复制现有参数或使用默认值
    ...deviceParameters.value[deviceId]?.parameters
  };
  
  // 显示控制面板
  showControlPanel.value = true;
};

// 从设备ID获取设备类型
const getDeviceTypeFromId = (deviceId) => {
  const parts = deviceId.split('-');
  return parts[0];
};


// 修改反应路径面板的HTML模板
// 根据当前图上的节点和边计算反应路径的边
const updateReactionPathEdges = () => {
  if (!graph) return;
  
  // 获取所有图上的边
  const allEdges = graph.getEdgeData();
  console.log("图上的所有边:", allEdges);
  
  // 获取所有图上的节点
  const allNodes = graph.getNodeData();
  const existingNodeIds = allNodes.map(node => node.id);
  
  // 遍历反应路径，找出每个路径所需的边
  reactionPaths.value.forEach(path => {
    // 先过滤不存在的节点
    path.nodes = path.nodes.filter(nodeId => existingNodeIds.includes(nodeId));
    
    const pathNodes = path.nodes;
    const pathEdges = [];
    
    // 查找连接路径中任意两个节点的边
    allEdges.forEach(edge => {
      if (pathNodes.includes(edge.source) && pathNodes.includes(edge.target)) {
        pathEdges.push(edge.id);
      }
    });
    
    // 更新路径的边
    path.edges = pathEdges;
    console.log(`反应路径 ${path.name} 的边:`, pathEdges);
  });
};

// 硬件图完全加载后调用
const initReactionPathsForGraph = () => {
  if (!graph) return;
  
  console.log("初始化反应路径数据");
  
  const nodes = graph.getNodeData();
  const edges = graph.getEdgeData();
  
  if (nodes.length > 0) {
    // 预处理反应路径数据
    preprocessReactionPaths(nodes, edges);
    
    // 更新右侧面板
    if (isShowingReactionPath.value && selectedReactionPathIndex.value !== null) {
      selectReactionPath(selectedReactionPathIndex.value);
    }
  }
};

// 在成功后调用
const onGraphLoaded = () => {
  console.log("硬件图加载完成，初始化反应路径");
  
  // 延迟执行，确保图已完全渲染
  setTimeout(() => {
    initReactionPathsForGraph();
  }, 500);
};

// 选择反应路径
const selectReactionPath = (index) => {
  try {
    // 先清除上一次的高亮
    clearReactionPathHighlight(false);
    
    selectedReactionPathIndex.value = index;
    const path = reactionPaths.value[index];
    
    if (!path || !graph) {
      console.warn("无效的反应路径或图表未初始化");
      return;
    }
    
    console.log(`选择反应路径: ${path.name}`);
    
    updateReactionPathEdges();
    
    if (path.edges.length === 0) {
      ElMessage.warning("反应路径边为空，请先选择硬件结构");
    }
    
    // 显示参数变更队列面板，方便用户配置设备后直接生成工作流
    showPendingChangesPanel.value = true;
    
    // 显示提示信息
    ElMessage.info('请点击设备调整参数后，点击"生成工作流并执行"按钮自动执行该路径的反应流程');
    
    // 🎯 修改：只高亮边，不修改节点样式（因为节点使用图片）
    
    // 首先重置所有边的样式，确保完全清除先前的高亮效果
    const allEdges = graph.getEdgeData();
    graph.updateEdgeData(allEdges.map(edge => ({
      id: edge.id,
      style: {
        stroke: '#91d5ff',
        lineWidth: 2,
        opacity: 1,
        shadowBlur: 0,
        shadowColor: null,
        animates: [],
        endArrow: {
          fill: '#91d5ff',
          stroke: '#91d5ff'
        }
      }
    })));
    
    // 🎯 移除节点高亮代码，因为图片节点修改边框等样式无效果
    // 设备节点使用图片，所以不需要修改节点样式
    
    // 高亮路径中的边 - 增强视觉效果
    const edgeUpdates = path.edges.map(edgeId => ({
      id: edgeId,
      style: {
        stroke: path.color,
        lineWidth: 6,  // 🎯 增加线宽到6，更明显
        opacity: 1,
        endArrow: {
          fill: path.color,
          stroke: path.color,
          lineWidth: 2  // 箭头线宽
        },
        // 🎯 增强发光效果
        shadowColor: path.color,
        shadowBlur: 15,  // 增加阴影模糊度
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        // 🎯 优化动画效果，使边更突出
        animates: [
          {
            iterations: Infinity,
            attribute: 'shadowBlur',
            duration: 2000,  // 稍微放慢动画速度
            easing: 'ease-in-out',
            keyframes: [
              { value: 10, time: 0 },
              { value: 20, time: 0.5 },  // 增大最大阴影值
              { value: 10, time: 1 }
            ]
          },
          {
            iterations: Infinity,
            attribute: 'lineWidth',
            duration: 2000,
            easing: 'ease-in-out',
            keyframes: [
              { value: 6, time: 0 },
              { value: 8, time: 0.5 },  // 线宽也有呼吸效果
              { value: 6, time: 1 }
            ]
          }
        ]
      }
    }));
    
    // 淡化非路径边，突出反应路径
    const allEdgeIds = graph.getEdgeData().map(edge => edge.id);
    const nonPathEdges = allEdgeIds.filter(id => !path.edges.includes(id));
    
    const fadeEdgeUpdates = nonPathEdges.map(edgeId => ({
      id: edgeId,
      style: {
        opacity: 0.3,  // 🎯 进一步降低非路径边的透明度
        stroke: '#d9d9d9',  // 更淡的灰色
        lineWidth: 1,
        shadowBlur: 0,
        shadowColor: null,
        animates: []
      }
    }));
    
    // 先更新需要淡化的边
    if (fadeEdgeUpdates.length > 0) {
      graph.updateEdgeData(fadeEdgeUpdates);
    }
    
    // 再更新高亮的边
    if (edgeUpdates.length > 0) {
      graph.updateEdgeData(edgeUpdates);
    }
    
    // 渲染更新
    graph.render();
    
    // 自动找到合适的查看范围
    const pathNodeIds = path.nodes;
    if (pathNodeIds.length > 0) {
      // 使用G6 v5正确的方法来聚焦元素
      graph.fitView({
        padding: 20, // 设置边距
        nodes: pathNodeIds, // 指定要聚焦的节点
        duration: 500, // 动画时长
        easing: 'ease' // 动画缓动函数
      });
    }
    
    ElMessage.success(`已显示 ${path.name} 反应路径`);
  } catch (error) {
    console.error("选择反应路径出错:", error);
    ElMessage.error(`高亮反应路径失败: ${error.message}`);
  }
};

// 清除反应路径高亮
const clearReactionPathHighlight = (resetSelection = true) => {
  try {
    if (!graph) return;
    
    console.log("清除反应路径高亮");
    
    // 🎯 移除节点样式恢复代码，因为图片节点不需要修改样式
    // 设备节点使用图片，所以不需要恢复节点样式
    
    // 恢复所有边的默认样式
    const edges = graph.getEdgeData();
    const edgeUpdates = edges.map(edge => ({
      id: edge.id,
      style: {
        stroke: '#91d5ff',
        lineWidth: 2,
        opacity: 1,
        shadowBlur: 0,
        shadowColor: null,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        endArrow: {
          fill: '#91d5ff',
          stroke: '#91d5ff'
        },
        // 移除动画
        animates: []
      }
    }));
    
    // 🎯 只更新边的样式，不更新节点
    if (edgeUpdates.length > 0) {
      graph.updateEdgeData(edgeUpdates);
    }
    
    graph.render();
    
    // 重置选择状态
    if (resetSelection) {
      selectedReactionPathIndex.value = null;
    }
    
    ElMessage.info('已清除反应路径高亮');
  } catch (error) {
    console.error("清除反应路径高亮出错:", error);
    ElMessage.error(`清除反应路径高亮失败: ${error.message}`);
  }
};

// 加载硬件图后，预处理反应路径
const preprocessReactionPaths = (nodes, edges) => {
  if (!nodes || !edges) return;
  
  console.log("预处理反应路径数据");
  
  // 根据硬件图中的实际节点过滤反应路径
  const existingNodeIds = nodes.map(node => node.id);
  
  reactionPaths.value.forEach(path => {
    // 过滤掉不存在的节点
    path.nodes = path.nodes.filter(nodeId => existingNodeIds.includes(nodeId));
    
    // 计算这个路径使用的边
    const pathEdges = [];
    edges.forEach(edge => {
      if (path.nodes.includes(edge.source) && path.nodes.includes(edge.target)) {
        pathEdges.push(edge.id);
      }
    });
    
    path.edges = pathEdges;
    console.log(`预处理后的反应路径 ${path.name}: ${path.nodes.length}个节点, ${path.edges.length}个边`);
  });
};
// 获取设备类型显示标签
const getDeviceTypeLabel = (type) => {
  const labels = {
    'pump': '泵',
    'valve': '阀门',
    'chip': '加热芯片',
    'mfc': 'MFC控制器',
    'light': '光照控制',
    'bottle': '瓶'
  };
  return labels[type] || type;
};

// 获取参数显示标签
const getParameterLabel = (param) => {
  const labels = {
    'position': '位置',
    'speed': '速度',
    'currentTemp': '当前温度',
    'targetTemp': '目标温度',
    'flowRate': '流速',
    'intensity': '光强'
  };
  return labels[param] || param;
};

// 获取比较操作符显示标签
const getComparisonLabel = (comparison) => {
  const labels = {
    'eq': '等于',
    'gt': '大于',
    'lt': '小于',
    'gte': '大于等于',
    'lte': '小于等于',
    'approx': '约等于'
  };
  return labels[comparison] || comparison;
};

// 获取参数单位
const getUnitForParameter = (param) => {
  const units = {
    'position': '',
    'speed': '%',
    'currentTemp': '°C',
    'targetTemp': '°C',
    'flowRate': 'ml/min',
    'intensity': '%'
  };
  return units[param] || '';
};

// 从匹配数据加载图形
const loadGraphFromMatchData = async (matchData) => {
  try {
    if (!matchData) {
      errorMessage.value = '缺少匹配数据，无法加载反应路径';
      return;
    }
    
    isLoading.value = true;
    
    console.log('从匹配数据加载图形:', matchData);
    
    // 解析匹配数据 - 处理H_with_map结构
    let pathConfig;
    
    // 如果是字符串，先解析
    if (typeof matchData === 'string') {
      pathConfig = JSON.parse(matchData);
    } else {
      pathConfig = matchData;
    }
    
    console.log('解析后的路径配置:', pathConfig);
    
    // 检查数据格式 - H_with_map结构有nodes和edges
    if (!pathConfig.nodes || !pathConfig.edges) {
      console.log('数据格式不匹配，尝试从现有硬件结构高亮反应路径');
      
      // 检查是否已有硬件结构加载
      if (graph && graph.getNodeData().length > 0) {
        // 直接高亮现有硬件结构中的反应路径
        highlightReactionPathInExistingGraph();
        isLoading.value = false;
        return;
      } else {
        // 尝试加载默认硬件结构
        console.log('没有现有硬件结构，尝试加载默认结构');
        if (savedPaths.value.length > 0) {
          // 加载第一个可用的硬件结构
          await loadStructureFromFile(savedPaths.value[0]);
          // 加载完成后高亮反应路径
          setTimeout(() => {
            highlightReactionPathInExistingGraph();
          }, 1000);
        } else {
          errorMessage.value = '无法解析匹配数据，且没有可用的硬件结构';
        }
        isLoading.value = false;
        return;
      }
    }
    
    // 创建图形对象
    if (graph) {
      graph.clear();
    }
    
    // 处理节点数据 - 与viewInformation保持一致
    const nodesData = [];
    if (pathConfig.nodes?.length) {
      pathConfig.nodes.forEach(node => {
        if (!node.id) return;
        
        const processedNode = {
          id: node.id,
          type: "image",
          data: {
            deviceType: node.data?.deviceType || node.id.split('-')[0] || 'unknown',
            label: node.data?.label || "设备"
          },
          style: {
            x: node.style?.x || 100 + Math.random() * 300,
            y: node.style?.y || 100 + Math.random() * 200,
            size: node.style?.size || [40, 40],
            label: node.style?.label || `设备 (${node.id})`,
            labelCfg: {
              position: "bottom",
              offset: [0, 5],
              style: {
                fill: "#333",
                fontSize: 12
              }
            }
          }
        };

        // 设置图标 - 与viewInformation保持一致
        const deviceType = processedNode.data.deviceType;
        switch (deviceType) {
          case "pump": processedNode.style.src = pump; break;
          case "valve": processedNode.style.src = valve; break;
          case "chip": processedNode.style.src = chip; break;
          case "mfc": processedNode.style.src = mfc; break;
          case "light": processedNode.style.src = light; break;
          case "bottle": processedNode.style.src = bottle; break;
          default: processedNode.style.src = bottle;
        }

        nodesData.push(processedNode);
      });
    }
    
    // 处理边数据 - 关键：将H_with_map的edges转换为viewInformation期望的links格式
    const edgesData = [];
    if (pathConfig.edges?.length) {
      pathConfig.edges.forEach(edge => {
        if (!edge.source || !edge.target) return;
        
        // 🎯 关键：通过边的颜色判断是否为反应路径（与viewInformation相同）
        const edgeColor = edge.style?.stroke && 
                        (edge.style.stroke.toUpperCase() === "#FFA500" || 
                          edge.style.stroke.toUpperCase() === "#FAAD14" ||
                          edge.style.stroke.toUpperCase() === "ORANGE") 
                        ? '#faad14'  // 黄色 = 反应路径
                        : '#91d5ff'; // 蓝色 = 普通连接
        
        console.log(`边 ${edge.source} -> ${edge.target} 颜色:`, edgeColor, '原始颜色:', edge.style?.stroke);
        
        edgesData.push({
          id: edge.id || `edge-${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          style: {
            stroke: edgeColor,
            lineWidth: edgeColor === '#faad14' ? 3 : 2, // 反应路径边更粗
            endArrow: {
              fill: edgeColor,
              stroke: edgeColor
            }
          }
        });
      });
    }
    
    // 添加节点和边数据到图形
    if (nodesData.length) graph.addNodeData(nodesData);
    if (edgesData.length) graph.addEdgeData(edgesData);
    
    // 渲染图形
    graph.render();
    
    // 自动适应视图 - 与viewInformation保持一致
    if (nodesData.length) {
      graph.fitView({
        padding: [20, 40, 20, 40],
        animate: true
      });
      
      // 进一步缩小视图
      setTimeout(() => {
        graph.zoomTo(0.8, { duration: 500 });
      }, 100);
    }
    
    // 创建反应路径对象用于显示
    const reactionPathEdges = edgesData.filter(edge => edge.style.stroke === '#faad14' || edge.style.stroke === '#FFA500');
    const reactionPathNodes = new Set();
    
    // 收集反应路径涉及的节点
    reactionPathEdges.forEach(edge => {
      reactionPathNodes.add(edge.source);
      reactionPathNodes.add(edge.target);
    });
    
    // 🎯 如果没有找到橙色边，使用matchedPath数据创建反应路径
    if (reactionPathNodes.size === 0 && editTaskData.value.matchedPath) {
      console.log('未找到橙色边，使用matchedPath创建反应路径:', editTaskData.value.matchedPath);
      
      // 使用matchedPath中的设备作为反应路径节点
      editTaskData.value.matchedPath.forEach(nodeId => {
        if (nodesData.some(node => node.id === nodeId)) {
          reactionPathNodes.add(nodeId);
        }
      });
      
      // 找出这些节点之间的连接边
      const pathNodeArray = Array.from(reactionPathNodes);
      edgesData.forEach(edge => {
        if (pathNodeArray.includes(edge.source) && pathNodeArray.includes(edge.target)) {
          reactionPathEdges.push(edge);
          // 更新边的样式为反应路径样式
          edge.style.stroke = '#faad14';
          edge.style.lineWidth = 4;
          edge.style.endArrow = {
            fill: '#faad14',
            stroke: '#faad14'
          };
        }
      });
      
      console.log('基于matchedPath创建的反应路径节点:', Array.from(reactionPathNodes));
      console.log('基于matchedPath创建的反应路径边:', reactionPathEdges.length);
    }
    
    // 🎯 更新现有反应路径的边数据，而不是创建新的反应路径
    if (reactionPaths.value.length > 0 && selectedReactionPathIndex.value !== null) {
      const currentPath = reactionPaths.value[selectedReactionPathIndex.value];
      if (currentPath && reactionPathEdges.length > 0) {
        // 更新当前反应路径的边数据
        currentPath.edges = reactionPathEdges.map(edge => edge.id);
        console.log(`已更新反应路径 "${currentPath.name}" 的边数据，包含 ${reactionPathEdges.length} 条连接`);
      }
    }
    
    // 如果没有现有反应路径但找到了路径节点，创建新的反应路径
    if (reactionPaths.value.length === 0 && reactionPathNodes.size > 0) {
      const editReactionPath = {
        id: `edit-path-${Date.now()}`,
        name: `${editTaskData.value.taskName} (${editTaskData.value.taskKey})`,
        description: `编辑反应路径: ${editTaskData.value.product || '未知产物'}`,
        nodes: Array.from(reactionPathNodes),
        edges: reactionPathEdges.map(edge => edge.id),
        color: reactionPathEdges.length > 0 && reactionPathEdges[0].style.stroke === '#FFA500' ? '#FFA500' : '#faad14'
      };
      
      // 设置反应路径数据
      reactionPaths.value = [editReactionPath];
      selectedReactionPathIndex.value = 0;
      
      ElMessage.success(`已加载反应路径，包含 ${reactionPathNodes.size} 个设备和 ${reactionPathEdges.length} 条连接`);
    }
    
  } catch (error) {
    console.error('加载匹配数据失败:', error);
    errorMessage.value = `加载匹配数据失败: ${error.message}`;
  } finally {
    isLoading.value = false;
  }
};

// 在现有图形中高亮反应路径
const highlightReactionPathInExistingGraph = () => {
  if (!graph || !editTaskData.value || !editTaskData.value.matchedPath) {
    console.log('无法高亮反应路径：缺少图形实例或匹配路径数据');
    return;
  }
  
  try {
    const pathNodes = editTaskData.value.matchedPath;
    console.log('高亮反应路径节点:', pathNodes);
    
    // 获取当前图中的所有节点和边
    const allNodes = graph.getNodeData();
    const allEdges = graph.getEdgeData();
    
    // 过滤出存在于图中的路径节点
    const existingPathNodes = pathNodes.filter(nodeId => 
      allNodes.some(node => node.id === nodeId)
    );
    
    console.log('图中存在的路径节点:', existingPathNodes);
    
    if (existingPathNodes.length === 0) {
      console.warn('图中没有找到匹配的路径节点');
      ElMessage.warning('当前硬件结构中没有找到匹配的反应路径设备');
      return;
    }
    
    // 重置所有节点和边的样式
    const allNodeUpdates = allNodes.map(node => ({
      id: node.id,
      style: {
        ...node.style,
        lineWidth: 1,
        stroke: '#40a9ff',
        shadowColor: 'rgba(144, 147, 153, 0.3)',
        shadowBlur: 10
      }
    }));
    
    const allEdgeUpdates = allEdges.map(edge => ({
      id: edge.id,
      style: {
        ...edge.style,
        stroke: '#91d5ff',
        lineWidth: 2,
        endArrow: {
          fill: '#91d5ff',
          stroke: '#91d5ff'
        }
      }
    }));
    
    // 应用重置样式
    graph.updateNodeData(allNodeUpdates);
    graph.updateEdgeData(allEdgeUpdates);
    
    // 高亮路径中的节点
    const nodeUpdates = existingPathNodes.map(nodeId => ({
      id: nodeId,
      style: {
        lineWidth: 3,
        stroke: '#faad14',
        shadowColor: '#faad14',
        shadowBlur: 15,
        fill: '#fffbe6'
      }
    }));
    
    if (nodeUpdates.length > 0) {
      graph.updateNodeData(nodeUpdates);
    }
    
    // 找出路径中的边并高亮
    const pathEdges = [];
    allEdges.forEach(edge => {
      if (existingPathNodes.includes(edge.source) && existingPathNodes.includes(edge.target)) {
        pathEdges.push(edge.id);
      }
    });
    
    console.log('高亮反应路径边:', pathEdges);
    
    const edgeUpdates = pathEdges.map(edgeId => ({
      id: edgeId,
      style: {
        stroke: '#faad14',
        lineWidth: 4,
        endArrow: {
          fill: '#faad14',
          stroke: '#faad14'
        }
      }
    }));
    
    if (edgeUpdates.length > 0) {
      graph.updateEdgeData(edgeUpdates);
    }
    
    // 🎯 更新现有反应路径的边数据，而不是创建新的反应路径
    if (reactionPaths.value.length > 0 && selectedReactionPathIndex.value !== null) {
      const currentPath = reactionPaths.value[selectedReactionPathIndex.value];
      if (currentPath && pathEdges.length > 0) {
        // 更新当前反应路径的边数据
        currentPath.edges = pathEdges;
        console.log(`已更新现有反应路径 "${currentPath.name}" 的边数据`);
      }
      
      // 渲染图形
      graph.render();
      
      ElMessage.success(`已高亮反应路径，包含 ${existingPathNodes.length} 个设备和 ${pathEdges.length} 条连接`);
      return;
    }
    
    // 如果没有现有反应路径，创建新的反应路径对象用于显示
    const editReactionPath = {
      id: `edit-path-${Date.now()}`,
      name: `${editTaskData.value.taskName} (${editTaskData.value.taskKey})`,
      description: `编辑反应路径: ${editTaskData.value.product || '未知产物'}`,
      nodes: existingPathNodes,
      edges: pathEdges,
      color: '#faad14'
    };
    
    // 设置反应路径数据
    reactionPaths.value = [editReactionPath];
    selectedReactionPathIndex.value = 0;
    
    // 设置视图自适应，聚焦到反应路径
    if (existingPathNodes.length > 0) {
      // 计算路径节点的边界框
      const pathNodePositions = existingPathNodes.map(nodeId => {
        const node = allNodes.find(n => n.id === nodeId);
        return node ? { x: node.style.x, y: node.style.y } : null;
      }).filter(pos => pos !== null);
      
      if (pathNodePositions.length > 0) {
        const minX = Math.min(...pathNodePositions.map(p => p.x));
        const maxX = Math.max(...pathNodePositions.map(p => p.x));
        const minY = Math.min(...pathNodePositions.map(p => p.y));
        const maxY = Math.max(...pathNodePositions.map(p => p.y));
        
        // 聚焦到路径区域
        graph.fitView({
          padding: [50, 50, 50, 50],
          animate: true
        });
      }
    }
    
    // 显示成功消息
    ElMessage.success(`已高亮显示反应路径，包含 ${existingPathNodes.length} 个设备`);
    
  } catch (error) {
    console.error('高亮反应路径失败:', error);
    ElMessage.error('高亮反应路径失败');
  }
};

// 监听硬件图加载完成
watch(() => selectedPath.value, (newPath) => {
  if (newPath) {
    console.log("硬件图路径变更，更新反应路径数据");
    
    // 延迟执行，确保图已加载完成
    setTimeout(() => {
      if (graph) {
        const nodes = graph.getNodeData();
        const edges = graph.getEdgeData();
        
        // 预处理路径数据
        preprocessReactionPaths(nodes, edges);
        
        // 如果有选中的反应路径，重新应用高亮
        if (selectedReactionPathIndex.value !== null) {
          selectReactionPath(selectedReactionPathIndex.value);
        }
      }
    }, 500);
  }
});


</script>

<style scoped>
/* 控制面板分区样式 */
.reaction-path-button {
  position: relative;
  background-color: #722ed1;
  color: white;
  border-color: #722ed1;
}

.reaction-path-button::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.3), rgba(255,255,255,0.1));
  background-size: 300% 100%;
  border-radius: 4px;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  animation: shimmer 2s infinite;
}

.reaction-path-button.active::after {
  opacity: 1;
}

@keyframes shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
.device-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  z-index: 1002;
}

.current-status-section, .control-section {
  padding: 12px;
  border-radius: 6px;
  background-color: #f9f9f9;
  border: 1px solid #e8e8e8;
}

.current-status-section {
  background-color: #f0f7ff;
  border-color: #d0e6ff;
}

.control-section {
  background-color: #f6ffed;
  border-color: #d9f7be;
}

.section-title {
  font-weight: bold;
  font-size: 14px;
  padding-bottom: 8px;
  margin-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.status-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.status-label {
  color: #666;
  font-weight: 500;
}

.status-value {
  font-weight: bold;
  color: #1890ff;
}

@media screen and (min-width: 768px) {
  .device-controls {
    flex-direction: row;
  }
  
  .current-status-section, .control-section {
    flex: 1;
  }
}
.main-container {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

/* 工具栏样式 */
.toolbar {
  position: fixed;
  top: 90px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding: 10px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgb(0 0 0 / 10%);
}

.tool-button {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 5px;
  color: #666;
  cursor: pointer;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  transition: all 0.3s;
}

.tool-button:hover {
  color: #1890ff;
  background: #f0f0f0;
}

.tool-button.active {
  color: #1890ff;
  background: #e6f7ff;
  border-color: #91d5ff;
}

.tool-button svg {
  margin-right: 5px;
}

.sidebar-toggle {
  position: fixed;
  top: 50%;
  left: 200px;
  z-index: 1000;
  padding: 10px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  transition: left 0.3s;
}

/* 当框架侧边栏折叠时，按钮位置调整 */
.toggle-framework-collapsed {
  left: 54px;
}

.sidebar {
  position: fixed;
  top: 83px;
  bottom: 0;
  left: 0px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  width: 200px;
  padding: 20px;
  overflow-y: auto;
  background: white;
  box-shadow: 2px 0 10px rgb(0 0 0 / 10%);
  transition: all 0.3s;
  transform: translateX(0);
}

/* 图标容器，让它可以滚动且占据主要空间 */
.icons-container {
  flex: 1;
  margin-bottom: 80px; /* 为底部按钮预留空间 */
  overflow-y: auto;
}

/* 当框架侧边栏折叠时的样式 */
.sidebar-collapsed {
  left: 54px; /* 框架侧边栏折叠后的宽度 */
}

/* 当侧边栏隐藏时的样式 */
.sidebar-hidden {
  transform: translateX(-100%);
}

.icon-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin: 8px 0;
  cursor: move;
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 6px;
  transition: all 0.3s;

  &:hover {
    background: #f0f9ff;
    box-shadow: 0 2px 6px rgb(0 0 0 / 5%);
    transform: translateY(-2px);
  }
}

.icon-image {
  display: block;
  width: 26px;
  height: 26px;
  margin-right: 10px;
}

.graph-container {
  left: 200px;
  position: relative;
  height: 600px;
  margin-left: 0; /* 侧边栏宽度 */
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  box-shadow: 0 3px 10px rgb(0 0 0 / 5%);
  transition:
    margin 0.3s,
    border-color 0.3s;
}

/* 禁用拖拽时的样式 */
.graph-container.drag-disabled::before {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  content: "";
  background-color: rgb(0 0 0 / 2%);
  border-radius: 8px;
}

/* 当自定义侧边栏关闭时 */
.graph-container-full {
  margin-left: 0;
}

/* 当框架侧边栏折叠时 */
.graph-container-collapsed {
  margin-left: 254px; /* 框架侧边栏折叠宽度(54px) + 自定义侧边栏宽度(200px) */
}

/* 当自定义侧边栏关闭且框架侧边栏折叠时 */
.graph-container-full.graph-container-collapsed {
  margin-left: 54px; /* 仅框架侧边栏折叠宽度 */
}

/* 设备控制面板样式 - 可拖动浮动面板 */
.device-control-panel {
  position: fixed;
  z-index: 1000;
  width: 400px;
  max-height: 80vh;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.panel-header {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 80%;
  max-width: 600px;
  padding: 15px 20px;
  background-color: #f0f9ff;
  border-bottom: 1px solid #e6f7ff;
  border-radius: 8px 8px 0 0;
}

.panel-header h3 {
  margin: 0;
  color: #1890ff;
}

.close-btn {
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  background: none;
  border: none;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #f56c6c;
}

.panel-content {
  box-sizing: border-box;
  width: 100%;
  padding: 0;
  background-color: #fff;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

/* 拖动手柄样式 */
.draggable-header {
  cursor: move;
  user-select: none;
  background: #f8fafc;
  color: #333;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e8e8e8;
}

.draggable-header:hover {
  background: #e6f7ff;
}

.drag-handle {
  font-size: 16px;
  margin-right: 8px;
  opacity: 0.6;
  cursor: move;
  color: #999;
}

.device-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.device-title {
  font-weight: 600;
  font-size: 14px;
  margin-right: 12px;
  color: #1890ff;
}

.data-source-indicator {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 12px;
}

.data-source-indicator.connected {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.data-source-indicator.disconnected {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.close-btn {
  background: #f5f5f5;
  color: #999;
  border: 1px solid #d9d9d9;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #fff2f0;
  color: #ff4d4f;
  border-color: #ff4d4f;
}

.device-info {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.device-id {
  font-weight: bold;
  margin-bottom: 4px;
}

.device-module-id {
  font-size: 12px;
  color: #999;
}

.device-status {
  display: inline-block;
  padding: 5px 10px;
  margin-top: 8px;
  font-weight: bold;
  border-radius: 4px;
}

/* 设备状态颜色 */
.device-status.running,
.device-status.open,
.device-status.heating {
  color: #67c23a;
  background-color: #f0f9eb;
}

.device-status.stopped,
.device-status.closed,
.device-status.idle {
  color: #909399;
  background-color: #f4f4f5;
}

.device-status.error {
  color: #f56c6c;
  background-color: #fef0f0;
}

.device-status.cooling {
  color: #1890ff;
  background-color: #e6f7ff;
}

.device-controls {
  margin-bottom: 20px;
  padding: 0 16px 16px 16px;
}

.data-row {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  margin-bottom: 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 15px 0;
}

.control-row button {
  padding: 8px 15px;
  margin-right: 10px;
  color: white;
  cursor: pointer;
  background: #1890ff;
  border: none;
  border-radius: 4px;
  transition: all 0.3s;
}

.control-row button:hover {
  background-color: #40a9ff;
  box-shadow: 0 2px 6px rgb(24 144 255 / 20%);
}

.control-row span {
  margin-right: 10px;
}

.control-row input[type="range"] {
  flex: 1;
  min-width: 150px;
  margin: 0 10px;
}

/* 阀门控制面板新增样式 */
.position-control {
  margin-bottom: 15px;
}

/* 加载指示器样式 */
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgb(255 255 255 / 80%);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f0f0f0;
  border-top: 5px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 15px;
  font-size: 16px;
  color: #1890ff;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 错误提示样式 */
.error-message {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  padding: 15px 20px;
  color: white;
  background-color: #f56c6c;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

.close-error-btn {
  margin-left: 10px;
  font-size: 18px;
  color: white;
  cursor: pointer;
  background: none;
  border: none;
}

/* 设备控制面板标题样式已移至拖动样式部分 */

/* 启用/禁用按钮样式 */
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.active-btn {
  color: white;
  background-color: #67c23a;
}

/* 添加反应路径选择 */
.path-selector {
  position: fixed;
  top: 100px;
  left: 200px;
  z-index: 1000;
  padding: 10px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.path-options {
  display: flex;
  flex-wrap: wrap;
  margin-top: 10px;
}

.path-option {
  padding: 8px 15px;
  margin: 5px;
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: all 0.3s;
}

.path-option:hover {
  background-color: #f0f0f0;
}

.path-option.selected {
  color: white;
  background-color: #1890ff;
  border-color: #1890ff;
}

/* WebSocket状态指示器 */
.ws-status {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1000;
  padding: 5px 10px;
  color: white;
  background-color: #f56c6c;
  border-radius: 4px;
}

.ws-status.connected {
  background-color: #67c23a;
}

/* MFC和光照控制面板样式 */
.intensity-control {
  margin-top: 15px;
}

/* 创建模式样式 */
.create-mode-sidebar {
  background-color: #f8f9fa;
  border-right: 1px solid #e0e0e0;
}

.create-mode-sidebar h3, .path-selector-sidebar h3 {
  padding: 10px 15px;
  margin-top: 0;
  margin-bottom: 15px;
  color: #1890ff;
  font-size: 18px;
  border-bottom: 1px solid #e0e0e0;
}

.create-mode-sidebar h4, .path-selector-sidebar h4 {
  padding: 0 15px;
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
  font-size: 16px;
}

.graph-container.create-mode {
  border: 2px dashed #1890ff;
  background-color: #fafafa;
}

/* 路径选择器侧边栏样式 */
.path-selector-sidebar {
  background-color: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.path-section {
  margin-bottom: 15px;
  padding: 0 15px;
}

.path-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 图标说明区域样式 */
.icons-legend-section {
  margin-top: 20px;
  padding: 0 15px;
  border-top: 1px solid #eaeaea;
  padding-top: 15px;
}

.icons-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: #f9f9f9;
  border-radius: 4px;
  transition: all 0.3s;
}

.legend-item:hover {
  background-color: #f0f0f0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.legend-icon {
  width: 24px;
  height: 24px;
  margin-right: 10px;
  object-fit: contain;
}

.legend-item span {
  font-size: 13px;
  color: #333;
}

.path-option {
  padding: 8px 12px;
  cursor: pointer;
  background-color: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  transition: all 0.3s;
}

.path-option:hover {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.path-option.selected {
  color: white;
  background-color: #1890ff;
  border-color: #1890ff;
}

.custom-path {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f0f7ff;
  border-color: #c6e2ff;
}

.custom-path:hover {
  background-color: #e0f0ff;
}

/* 保存按钮样式 */
.save-button {
  color: white;
  background-color: #52c41a;
  border-color: #52c41a;
}

.save-button:hover {
  background-color: #73d13d;
  border-color: #73d13d;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.dialog-content {
  width: 400px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dialog-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #1890ff;
  font-size: 18px;
}

.dialog-form {
  margin-bottom: 20px;
}

.dialog-form label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.dialog-form input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
}

.dialog-buttons button {
  padding: 8px 16px;
  margin-left: 10px;
  cursor: pointer;
  background-color: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.dialog-buttons button:hover {
  background-color: #e6e6e6;
}

.primary-button {
  color: white;
  background-color: #1890ff !important;
  border-color: #1890ff !important;
}

.primary-button:hover {
  background-color: #40a9ff !important;
  border-color: #40a9ff !important;
}

.path-type-selector {
  margin-bottom: 20px;
  padding: 0 15px;
}

.path-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #666;
  font-size: 14px;
}

/* 自定义路径选项中的删除按钮 */
.custom-path {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f0f7ff;
  border-color: #c6e2ff;
}

.custom-path:hover {
  background-color: #e0f0ff;
}

.delete-path-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  margin-left: 8px;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 50%;
  transition: all 0.3s;
}

.delete-path-btn:hover {
  color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.1);
}

/* 确认删除对话框中的警告文本 */
.warning-text {
  color: #f56c6c;
  font-weight: bold;
}

/* 删除按钮样式 */
.danger-button {
  color: white !important;
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
}

.danger-button:hover {
  background-color: #f78989 !important;
  border-color: #f78989 !important;
}

/* WebSocket连接状态指示器样式 */
.websocket-status-container {
  position: fixed;
  top: 10px;
  left: 10px; /* 改为左上角 */
  z-index: 9000; /* 降低z-index，低于参数变更队列面板 */
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  background: #fff;
  opacity: 0.9; /* 稍微透明 */
}

.ws-connected {
  border: 1px solid #67C23A;
}

.ws-disconnected {
  border: 1px solid #F56C6C;
  background: #FEF0F0;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.ws-connected .status-indicator {
  background-color: #67C23A;
  box-shadow: 0 0 8px #67C23A;
}

.ws-disconnected .status-indicator {
  background-color: #F56C6C;
  box-shadow: 0 0 8px #F56C6C;
  animation: pulse 1.5s infinite;
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  margin-right: 8px;
}

.ws-connected .status-text {
  color: #67C23A;
}

.ws-disconnected .status-text {
  color: #F56C6C;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.data-source-indicator {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  margin-right: 10px;
}

.data-source-indicator.connected {
  background-color: #52c41a;
  color: #fff;
}

.data-source-indicator.disconnected {
  background-color: #f56c6c;
  color: #fff;
}

.device-selection-dialog {
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.search-box {
  margin-bottom: 15px;
}

.search-box input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.device-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.device-group {
  margin-bottom: 15px;
}

.group-title {
  padding: 5px 10px;
  font-weight: bold;
  background-color: #f5f5f5;
  border-left: 3px solid #1890ff;
  margin-bottom: 8px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 5px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.device-item:hover {
  background-color: #f0f9ff;
  border-color: #91d5ff;
}

.no-devices {
  padding: 20px;
  text-align: center;
  color: #999;
}

/* 撤销按钮样式 */
.undo-button {
  color: white;
  background-color: #1890ff;
  border-color: #1890ff;
}

.undo-button:hover {
  background-color: #40a9ff;
  border-color: #40a9ff;
}

.undo-button:disabled {
  color: #d9d9d9;
  background-color: #f5f5f5;
  border-color: #d9d9d9;
  cursor: not-allowed;
  opacity: 0.6;
}

.operation-count {
  display: inline-block;
  padding: 0 4px;
  font-size: 12px;
  line-height: 16px;
  color: white;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  margin-left: 5px;
}

/* 设备参数输入框样式 */
.parameter-input {
  width: 60px;
  padding: 6px;
  margin: 0 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  text-align: center;
  transition: border-color 0.2s;
}

.parameter-input:focus {
  outline: none;
  border-color: #409eff;
}

.parameter-select {
  padding: 6px;
  margin: 0 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: white;
  transition: border-color 0.2s;
}

.parameter-select:focus {
  outline: none;
  border-color: #409eff;
}

.device-controls .control-row button {
  margin: 0 5px;
  padding: 6px 12px;
  color: #fff;
  background-color: #409eff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.device-controls .control-row button:hover {
  background-color: #66b1ff;
}

.reactant-input {
  width: 150px;
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  transition: border-color 0.2s;
}

/* 命令队列面板样式 */
.command-queue-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 360px;
  max-height: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

.panel-title {
  font-weight: bold;
  color: #333;
}

.panel-actions {
  display: flex;
  gap: 10px;
}

.send-all-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.send-all-btn:disabled {
  background-color: #b3d9ff;
  cursor: not-allowed;
}

.clear-btn {
  background-color: #ff4d4f;
  color: red;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.queue-list {
  padding: 10px;
  overflow-y: auto;
  max-height: 320px;
}

.command-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: #f9f9f9;
}

.device-info {
  display: flex;
  flex-direction: column;
}

.device-type {
  font-weight: bold;
  color: #1890ff;
}

.device-id {
  font-size: 0.8em;
  color: #999;
}

.command-info {
  display: flex;
  flex-direction: column;
  max-width: 160px;
  overflow: hidden;
}

.action {
  font-weight: 500;
}

.parameters {
  font-size: 0.8em;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 0 5px;
}

.remove-btn:hover {
  color: #ff4d4f;
}

/* 适配移动端的命令队列面板 */
@media screen and (max-width: 768px) {
  .command-queue-panel {
    width: 90%;
    left: 5%;
    right: 5%;
    bottom: 70px;
    max-height: 300px;
  }
  
  .queue-list {
    max-height: 200px;
  }
  
  .command-item {
    flex-wrap: wrap;
  }
  
  .command-info {
    max-width: 100%;
    margin-top: 5px;
  }
}

/* 合并的编辑控制面板 - 覆盖在反应路径面板右半边 */
.unified-edit-control-panel {
  position: fixed;
  bottom: 85px;
  right: 20px;
  width: 50%; /* 占据右半边 */
  max-width: 600px;
  min-width: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e8e8e8;
  max-height: 500px;
  z-index: 1001; /* 比反应路径面板高一层 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 编辑模式头部样式 */
.edit-mode-header {
  background: #f8fafc;
  color: #333;
  padding: 12px 16px;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.edit-mode-info {
  flex: 1;
}

.edit-mode-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
  color: #1890ff;
}

.edit-mode-subtitle {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 6px;
  color: #666;
}

.edit-path-status {
  display: flex;
  gap: 12px;
  font-size: 11px;
  opacity: 0.8;
}

.path-indicator {
  background: #e6f7ff;
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #91d5ff;
}

.path-devices {
  background: #e6f7ff;
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #91d5ff;
}

.edit-mode-actions {
  display: flex;
  gap: 8px;
}

.edit-mode-actions .tool-button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s;
}

.edit-mode-actions .save-button {
  background: #52c41a;
  color: white;
}

.edit-mode-actions .save-button:hover {
  background: #73d13d;
}

.edit-mode-actions .cancel-button {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.edit-mode-actions .cancel-button:hover {
  background: #fff2f0;
  color: #ff4d4f;
  border-color: #ff4d4f;
}

/* 参数变更队列部分样式 */
.parameter-changes-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 添加参数变更队列面板 - 简洁统一版 */
.parameter-changes-panel-new {
  position: fixed;
  bottom: 100px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-height: 450px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

/* 合并面板中的panel-header样式 */
.unified-edit-control-panel .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8fafc;
  border-bottom: 1px solid #e8e8e8;
}

/* 原来的独立面板header样式 */
.parameter-changes-panel-new .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8fafc;
  border-bottom: 1px solid #e8e8e8;
}

/* 合并面板中的样式 */
.unified-edit-control-panel .panel-title {
  font-weight: 600;
  font-size: 14px;
  color: #1890ff;
}

.unified-edit-control-panel .panel-actions {
  display: flex;
  gap: 6px;
}

.unified-edit-control-panel .changes-list {
  overflow-y: auto;
  padding: 0;
  flex: 1;
}

/* 原来的独立面板样式 */
.parameter-changes-panel-new .panel-title {
  font-weight: 600;
  font-size: 14px;
  color: #1890ff;
}

.parameter-changes-panel-new .panel-actions {
  display: flex;
  gap: 6px;
}

/* 通用按钮样式 - 适用于两种面板 */
.send-all-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.send-all-btn:hover {
  background: #40a9ff;
}

.send-all-btn:disabled {
  background: #bae7ff;
  cursor: not-allowed;
}

.workflow-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.workflow-btn:hover {
  background: #40a9ff;
}

.workflow-btn:disabled {
  background: #91d5ff;
  cursor: not-allowed;
}

.clear-btn {
  background: #f5f5f5;
  color: #595959;
  border: 1px solid #d9d9d9;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.clear-btn:hover {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.close-panel-btn {
  background: #f5f5f5;
  color: #595959;
  border: 1px solid #d9d9d9;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  margin-left: 6px;
}

.close-panel-btn:hover {
  color: #ff4d4f;
  border-color: #ff4d4f;
}

/* 原来的独立面板changes-list样式 */
.parameter-changes-panel-new .changes-list {
  overflow-y: auto;
  padding: 0;
  flex: 1;
}

/* 通用change-item样式 - 适用于两种面板 */
.change-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #f0f0f0;
}

.change-item:hover {
  background-color: #fafafa;
}

.change-item:last-child {
  border-bottom: none;
}

.device-info {
  font-weight: 500;
  flex: 0 0 30%;
}

.device-type {
  color: #1890ff;
  font-size: 13px;
}

.device-id {
  font-size: 12px;
  color: #666;
}

.changes-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0 10px;
}

.parameter {
  font-size: 12px;
  color: #333;
  margin: 2px 0;
}

.remove-btn {
  background: none;
  border: none;
  color: #d9d9d9;
  font-size: 16px;
  cursor: pointer;
  padding: 0 5px;
}

.remove-btn:hover {
  color: #ff4d4f;
}

.no-changes {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

/* 发送参数按钮 */
.send-params-button {
  background-color: #1890ff;
  color: white;
  transition: all 0.3s;
}

.send-params-button:hover {
  background-color: #40a9ff;
}

/* 调试按钮样式 */
.debug-btn {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
  padding: 10px 15px;
  color: white;
  background-color: #1890ff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.debug-btn:hover {
  background-color: #40a9ff;
}

.badge {
  background-color: #ff4d4f;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 12px;
  margin-left: 5px;
}

/* 强制显示的测试面板 */
.force-display-panel {
  position: fixed;
  top: 100px;
  right: 20px;
  width: 300px;
  background-color: white;
  border: 3px solid #ff4d4f;
  border-radius: 8px;
  padding: 15px;
  z-index: 10000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.force-display-panel h3 {
  color: #ff4d4f;
  margin-top: 0;
}

.no-changes {
  padding: 20px 15px;
  text-align: center;
  color: #8c8c8c;
  font-style: italic;
  font-size: 13px;
}

.parameter {
  margin: 3px 0;
  padding: 2px 0;
}

.hardware-control-container {
  margin: 15px 0;
}

.hardware-control-card {
  margin-bottom: 15px;
}

.hardware-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hardware-card-content {
  padding: 10px 0;
}

.hardware-error-message {
  margin-top: 10px;
}

.data-source-indicator {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.data-source-indicator.connected {
  color: #67c23a;
  background-color: #f0f9eb;
}

.data-source-indicator.disconnected {
  color: #f56c6c;
  background-color: #fef0f0;
}


/* 流程编辑器头部 */
.workflow-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;
}

.workflow-editor-header h3 {
  font-size: 18px;
  color: #722ed1;
  margin: 0;
}

.workflow-actions {
  display: flex;
  gap: 10px;
}

.workflow-action-btn {
  padding: 8px 15px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.workflow-action-btn:hover {
  color: #722ed1;
  border-color: #722ed1;
}

.workflow-action-btn.save-btn {
  color: #fff;
  background-color: #52c41a;
  border-color: #52c41a;
}

.workflow-action-btn.save-btn:hover {
  background-color: #73d13d;
  border-color: #73d13d;
}

.workflow-action-btn.run-btn {
  color: #fff;
  background-color: #1890ff;
  border-color: #1890ff;
}

.workflow-action-btn.run-btn:hover {
  background-color: #40a9ff;
  border-color: #40a9ff;
}

.workflow-action-btn:disabled {
  color: #d9d9d9;
  background-color: #f5f5f5;
  border-color: #d9d9d9;
  cursor: not-allowed;
}

/* 流程编辑器内容 */
.workflow-editor-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 流程基本信息 */
.workflow-info {
  flex: 0 0 300px;
  padding: 15px;
  border-right: 1px solid #f0f0f0;
  overflow-y: auto;
}
.form-item {
  margin-bottom: 15px;
}

.form-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-item input, .form-item textarea, .form-item select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.form-item textarea {
  min-height: 80px;
  resize: vertical;
}

.form-item input:focus, .form-item textarea:focus, .form-item select:focus {
  border-color: #722ed1;
  outline: none;
  box-shadow: 0 0 0 2px rgba(114, 46, 209, 0.2);
}

/* 流程步骤 */
.workflow-steps {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
}

.workflow-steps h4 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #333;
}

.add-step-btn {
  padding: 4px 10px;
  background-color: #722ed1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.add-step-btn:hover {
  background-color: #9254de;
}

.no-steps {
  padding: 30px;
  text-align: center;
  color: #999;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.steps-container {
  margin-top: 20px;
}

.step-item {
  margin-bottom: 15px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  transition: all 0.3s;
}

.step-item:hover {
  border-color: #d3adf7;
}

.step-item.active-step {
  border-color: #722ed1;
  box-shadow: 0 0 0 2px rgba(114, 46, 209, 0.1);
}

.step-header {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #e8e8e8;
  cursor: pointer;
  transition: all 0.3s;
}

.active-step .step-header {
  background-color: #f0e6fd;
  border-color: #d3adf7;
}

.step-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #722ed1;
  color: white;
  border-radius: 50%;
  margin-right: 10px;
  font-size: 12px;
  font-weight: bold;
}

.step-title {
  flex: 1;
  font-weight: 500;
}

.step-actions {
  display: flex;
  gap: 5px;
}

.step-btn {
  width: 24px;
  height: 24px;
  background: none;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.step-btn:hover {
  color: #722ed1;
  border-color: #722ed1;
}

.step-btn.delete:hover {
  color: #f5222d;
  border-color: #f5222d;
}

.step-btn:disabled {
  color: #d9d9d9;
  cursor: not-allowed;
}

.step-details {
  padding: 15px;
  background-color: #fafafa;
}

/* 设备命令和条件样式 */
.device-commands, .step-conditions {
  margin-top: 20px;
  border-top: 1px dashed #e8e8e8;
  padding-top: 15px;
}

.device-commands h5, .step-conditions h5 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 14px;
  color: #333;
}

.add-command-btn, .add-condition-btn {
  padding: 3px 8px;
  background-color: #13c2c2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.add-command-btn:hover, .add-condition-btn:hover {
  background-color: #36cfc9;
}

.no-commands, .no-conditions {
  padding: 15px;
  text-align: center;
  color: #999;
  background-color: #f9f9f9;
  border-radius: 4px;
  font-size: 13px;
}

.command-item, .condition-item {
  margin-bottom: 15px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

.command-header, .condition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #e6fffb;
  border-bottom: 1px solid #b5f5ec;
}

.condition-header {
  background-color: #fcf4dc;
  border-bottom: 1px solid #ffe58f;
}

.command-title, .condition-title {
  font-weight: 500;
  font-size: 13px;
  color: #08979c;
}

.condition-title {
  color: #d4b106;
}

.cmd-btn, .cond-btn {
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cmd-btn.delete:hover, .cond-btn.delete:hover {
  color: #f5222d;
}

.command-form, .condition-form {
  padding: 12px;
  background-color: #fcfcfc;
}

.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.form-row label {
  width: 80px;
  flex-shrink: 0;
  font-size: 13px;
  color: #666;
}

.form-row select, .form-row input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.form-row select:focus, .form-row input:focus {
  border-color: #722ed1;
  outline: none;
  box-shadow: 0 0 0 2px rgba(114, 46, 209, 0.1);
}

/* 流程执行面板 */
.workflow-execution-panel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 400px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  overflow: hidden;
}

.execution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background-color: #722ed1;
  color: white;
}

.execution-header h3 {
  margin: 0;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
}

.execution-controls {
  display: flex;
  gap: 8px;
}

.execution-control-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.execution-control-btn.pause::before {
  content: "⏸";
}

.execution-control-btn.resume::before {
  content: "▶";
}

.execution-control-btn.stop::before {
  content: "⏹";
}

.execution-control-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.execution-progress {
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #666;
  font-size: 13px;
}

.execution-steps {
  max-height: 300px;
  overflow-y: auto;
  padding: 0 15px 15px;
}

.execution-step {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.execution-step:last-child {
  border-bottom: none;
}

.step-indicator {
  margin-right: 12px;
  position: relative;
}

.step-indicator::after {
  content: "";
  position: absolute;
  top: 30px;
  left: 12px;
  bottom: -10px;
  width: 1px;
  background-color: #e8e8e8;
}

.execution-step:last-child .step-indicator::after {
  display: none;
}

.step-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  margin-bottom: 8px;
}

.completed-step .step-number {
  background-color: #52c41a;
  color: white;
}

.active-step .step-number {
  background-color: #1890ff;
  color: white;
}

.pending-step .step-number {
  background-color: #f5f5f5;
  color: #999;
}

.step-status-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-content {
  flex: 1;
}

.step-name {
  font-weight: 500;
  margin-bottom: 5px;
}

.completed-step .step-name {
  color: #52c41a;
}

.active-step .step-name {
  color: #1890ff;
}

.pending-step .step-name {
  color: #999;
}

.step-description {
  font-size: 12px;
  color: #999;
}

/* 流程列表对话框 */
.workflow-list {
  max-height: 500px;
  overflow-y: auto;
}

.workflow-item {
  padding: 15px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.workflow-item:hover {
  border-color: #722ed1;
  background-color: #f9f0ff;
}

.workflow-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 5px;
  color: #333;
}

.path-info {
  font-size: 13px;
  color: #666;
}

.path-actions {
  padding: 12px 15px;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #f0f0f0;
}

.path-action-instructions {
  margin-bottom: 12px;
  padding: 10px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

.instruction-step {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.instruction-step:last-child {
  margin-bottom: 0;
}

.step-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #1890ff;
  color: white;
  font-weight: bold;
  margin-right: 8px;
  flex-shrink: 0;
}

.step-text {
  font-size: 13px;
  color: #333;
}

.clear-path-btn {
  background-color: #ff4d4f;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  align-self: flex-end;
}

.clear-path-btn:hover {
  background-color: #ff7875;
  box-shadow: 0 2px 6px rgba(255, 77, 79, 0.2);
}

.no-paths {
  padding: 20px;
  text-align: center;
  color: #999;
  font-style: italic;
}

/* 反应路径加载状态 */
.loading-paths {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  color: #722ed1;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(114, 46, 209, 0.2);
  border-radius: 50%;
  border-top-color: #722ed1;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #722ed1;
}

/* 反应路径错误信息 */
.path-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  text-align: center;
}

.error-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #ff4d4f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 15px;
}

.error-text {
  color: #ff4d4f;
  margin-bottom: 15px;
  font-size: 14px;
}

.retry-btn {
  background-color: #ff4d4f;
  color: white;
  border: none;
  padding: 6px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.retry-btn:hover {
  background-color: #ff7875;
  box-shadow: 0 2px 6px rgba(255, 77, 79, 0.2);
}

/* 反应路径按钮样式 */
.reaction-path-button {
  position: relative;
  background-color: #722ed1;
  color: white;
  border-color: #722ed1;
}
.reaction-path-button::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.3), rgba(255,255,255,0.1));
  background-size: 300% 100%;
  border-radius: 4px;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  animation: shimmer 2s infinite;
}

.reaction-path-button.active::after {
  opacity: 1;
}

@keyframes shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* 路径节点高亮动画 */
@keyframes pathNodePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(114, 46, 209, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(114, 46, 209, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(114, 46, 209, 0);
  }
}

.workflow-from-path {
  margin: 15px 0;
}

.generate-btn {
  background-color: #67c23a;
  color: white;
}

.generate-btn:hover {
  background-color: #85ce61;
}

.standard-workflow-params {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 10px;
}

.param-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.param-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.param-item span {
  min-width: 70px;
}

/* 添加到style标签内 */
.device-param-container {
  margin-bottom: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  background-color: #f9fafc;
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.device-header h4 {
  margin: 0;
  color: #409eff;
  font-size: 16px;
}

.workflow-steps-preview {
  margin-top: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px;
  background-color: #f9fafc;
}

.step-preview-item {
  display: flex;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 4px;
  background-color: white;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.05);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  font-weight: bold;
  margin-right: 15px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.step-desc {
  color: #666;
  font-size: 13px;
}

/* 工作流预览对话框样式 */
.workflow-preview-content {
  max-height: 70vh;
  overflow-y: auto;
}

.workflow-preview-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.workflow-preview-header h3 {
  margin: 0 0 10px 0;
  color: #722ed1;
  font-size: 20px;
}

.workflow-preview-desc {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.workflow-preview-meta {
  display: flex;
  gap: 15px;
  color: #999;
  font-size: 12px;
}

.workflow-preview-steps {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.workflow-preview-step {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.preview-step-header {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  background-color: #f9f0ff;
  border-bottom: 1px solid #ebeef5;
}

.preview-step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #722ed1;
  color: white;
  font-weight: bold;
  margin-right: 10px;
}

.preview-step-name {
  font-weight: bold;
  color: #333;
  font-size: 16px;
}

.preview-step-content {
  padding: 15px;
}

.preview-step-desc {
  margin-bottom: 15px;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
  color: #666;
}

.preview-commands-list {
  margin-bottom: 15px;
}

.preview-commands-list h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}

.preview-commands-scroll {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.preview-command-item {
  display: flex;
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
}

.preview-command-item:last-child {
  border-bottom: none;
}

.preview-command-device {
  flex: 0 0 120px;
  display: flex;
  flex-direction: column;
}

.preview-device-type {
  font-weight: bold;
  color: #1890ff;
  margin-bottom: 3px;
}

.preview-device-id {
  font-size: 12px;
  color: #999;
}

.preview-command-action {
  flex: 1;
  font-weight: 500;
}

.preview-command-params {
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.preview-param {
  margin-bottom: 3px;
}

.param-value {
  font-weight: bold;
  color: #333;
}


.preview-step-conditions {
  margin-bottom: 15px;
}

.preview-condition-item {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 4px;
}

.condition-type {
  font-weight: bold;
  color: #d48806;
  margin-bottom: 5px;
}

.condition-details {
  color: #666;
  font-size: 13px;
}

.preview-step-delay {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
}

.delay-icon {
  margin-right: 8px;
  font-size: 16px;
}

.delay-text {
  color: #52c41a;
  font-weight: 500;
}

/* 切换开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
  padding: 5px 10px;
  text-align: center;
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-switch input:checked + label {
  background-color: #1890ff;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-switch input:checked + label:before {
  transform: translateX(30px);
}

.toggle-switch input:focus + label {
  box-shadow: 0 0 1px #1890ff;
}

.valve-info {
  margin-left: 10px;
  color: #1890ff;
  font-size: 12px;
  font-style: italic;
}

/* 编辑模式样式 */
.edit-mode-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  padding: 8px 15px;
  margin-bottom: 10px;
  width: 100%;
}

.edit-mode-indicator span {
  font-weight: bold;
  color: #1890ff;
}

.edit-mode-actions {
  display: flex;
  gap: 10px;
}

.edit-mode-actions .tool-button.save-button {
  background-color: #52c41a;
  color: white;
}

.edit-mode-actions .tool-button.cancel-button {
  background-color: #f5f5f5;
  color: rgba(0, 0, 0, 0.65);
}

.cancel-button {
  background-color: #909399;
  color: white;
}

.cancel-button:hover {
  background-color: #a6a9ad;
}

/* 编辑模式指示器样式 */
.edit-mode-indicator {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.edit-path-status {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 13px;
  opacity: 0.9;
}

.path-indicator {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.path-devices {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
}

.edit-mode-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 🎯 工作流预览对话框中保存任务参数按钮的样式 */
.dialog-footer .el-button--warning {
  background-color: #e6a23c;
  border-color: #e6a23c;
  color: white;
  font-weight: 500;
}

.dialog-footer .el-button--warning:hover {
  background-color: #ebb563;
  border-color: #ebb563;
}

.dialog-footer .el-button--warning:disabled {
  background-color: #f5dab1;
  border-color: #f5dab1;
  color: #c0c4cc;
  cursor: not-allowed;
}

/* 工作流预览对话框按钮间距 */
.dialog-footer .el-button + .el-button {
  margin-left: 10px;
}

/* 🎯 反应路径面板样式 - 解决被侧边栏遮挡的问题 */
.reaction-path-panel {
  position: fixed;
  bottom: 20px;
  left: 220px; /* 基础左边距：侧边栏宽度(200px) + 间距(20px) */
  right: 20px;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e8e8e8;
  max-height: 300px;
  overflow-y: auto;
  transition: left 0.3s ease;
}

/* 当框架侧边栏折叠时 */
.reaction-path-panel.sidebar-collapsed {
  left: 274px; /* 框架侧边栏折叠宽度(54px) + 自定义侧边栏宽度(200px) + 间距(20px) */
}

/* 当自定义侧边栏隐藏时 */
.reaction-path-panel.sidebar-hidden {
  left: 20px; /* 仅保留基础间距 */
}

/* 当自定义侧边栏隐藏且框架侧边栏折叠时 */
.reaction-path-panel.sidebar-hidden.sidebar-collapsed {
  left: 74px; /* 框架侧边栏折叠宽度(54px) + 间距(20px) */
}

.reaction-path-panel .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  color: #333;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e8e8e8;
}

.reaction-path-panel .panel-title {
  font-weight: 600;
  font-size: 14px;
  margin: 0;
  color: #1890ff;
}

.reaction-path-panel .close-btn {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s;
}

.reaction-path-panel .close-btn:hover {
  background: #fff2f0;
  color: #ff4d4f;
  border-color: #ff4d4f;
}

.reaction-paths-list {
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.reaction-path-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.reaction-path-item:hover {
  border-color: #1890ff;
  background: #e6f7ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.reaction-path-item.active {
  border-color: #1890ff;
  background: #e6f7ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.reaction-path-item .path-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  font-size: 13px;
}

.reaction-path-item .path-info {
  color: #666;
  font-size: 12px;
  line-height: 1.4;
}

.no-paths {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

.loading-paths {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 12px;
}

.path-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: #f56c6c;
}

.error-icon {
  width: 24px;
  height: 24px;
  background: #f56c6c;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 8px;
}

.error-text {
  font-size: 12px;
  margin-bottom: 8px;
  text-align: center;
}

.retry-btn {
  padding: 4px 12px;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.retry-btn:hover {
  background: #f78989;
}

.path-actions {
  padding: 12px 16px;
  border-top: 1px solid #e8e8e8;
  background: #f9f9f9;
  border-radius: 0 0 8px 8px;
}

.path-action-instructions {
  margin-bottom: 12px;
}

.instruction-step {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
}

.step-icon {
  width: 16px;
  height: 16px;
  background: #722ed1;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  margin-right: 8px;
  flex-shrink: 0;
}

.step-text {
  line-height: 1.4;
}

.clear-path-btn {
  width: 100%;
  padding: 6px 12px;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.clear-path-btn:hover {
  background: #e6f7ff;
  border-color: #91d5ff;
  color: #1890ff;
}
</style>


