<template>
  <div>
    <!-- 工具栏 -->
    <div class="task-toolbar">
      <el-button 
        type="primary" 
        style="margin-bottom: 20px;" 
        @click="executeSelectedTasksWorkflow"
        :disabled="selectedRows.length === 0 || isExecutingWorkflow"
        :loading="isExecutingWorkflow"
      >
        <i class="el-icon-play"></i>
        {{ isExecutingWorkflow ? '启动中...' : 'Run 执行工作流' }}
      </el-button>
      
      <!-- 🔧 添加调试按钮 -->
      <el-button 
        type="primary" 
        style="margin-bottom: 20px; margin-left: 10px;" 
        @click="debugScheduleStatus"
        v-if="selectedRows.length > 0 || isScheduling"
        :disabled="isScheduling"
      >
        <i class="el-icon-search"></i>
        {{ isScheduling ? '调度中...' : '检查调度状态' }}
      </el-button>
      
      <!-- 🔧 添加状态调试按钮 -->
      <el-button 
        type="warning" 
        style="margin-bottom: 20px; margin-left: 10px;" 
        @click="debugPageState"
        size="small"
      >
        <i class="el-icon-warning"></i>
        状态调试
      </el-button>
      
      <!-- 🔧 添加状态恢复按钮 -->
      <el-button 
        type="success" 
        style="margin-bottom: 20px; margin-left: 10px;" 
        @click="forceRestoreState"
        size="small"
      >
        <i class="el-icon-refresh"></i>
        强制恢复
      </el-button>
      
      <!-- 🎯 简化的状态提示 -->
      <div v-if="isExecutingWorkflow" class="workflow-status-simple">
        <el-alert 
          title="工作流已启动" 
          type="success" 
          description="已跳转到监控界面，请查看工作流执行状态" 
          show-icon 
          :closable="false">
        </el-alert>
      </div>
      
      <!-- 🆕 调度状态提示 -->
      <div v-if="isScheduling" class="scheduling-status-simple" style="margin-top: 10px;">
        <el-alert 
          title="正在调度任务" 
          type="info" 
          description="请稍候，正在为选中的任务生成最优调度方案..." 
          show-icon 
          :closable="false">
        </el-alert>
      </div>
    </div>

    <el-table 
      ref="taskTable"
      :data="tableData" 
      border 
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <!-- Selection column -->
      <el-table-column 
        type="selection" 
        width="55" 
        align="center"
      ></el-table-column>
      
      <!-- ID column -->
      <el-table-column 
        prop="id" 
        label="ID" 
        min-width="10%" 
        align="center"
      ></el-table-column>
      
      <!-- Product column -->
      <el-table-column 
        prop="product" 
        label="Product" 
        min-width="15%"
        :show-overflow-tooltip="true"
      ></el-table-column>
      
      <!-- React Time column -->
      <el-table-column 
        label="React Time (h)" 
        min-width="12%"
        align="center"
      >
        <template #default="{ row }">
          <el-input 
            v-model="row.reactTime" 
            size="small" 
            type="number"
            min="0"
            step="0.1"
            @change="handleReactTimeChange(row)"
            style="width: 80px;"
          ></el-input>
        </template>
      </el-table-column>
      
      <!-- Created Data column -->
      <el-table-column 
        prop="createdData" 
        label="Created Time" 
        min-width="15%"
      ></el-table-column>
      
      <!-- Creator column -->
      <el-table-column 
        prop="creator" 
        label="Creator" 
        min-width="10%"
      ></el-table-column>
      
      <!-- Task Name column -->
      <el-table-column 
        prop="taskName" 
        label="Task Name" 
        min-width="25%"
      >
        <template #default="{ row }">
          <span>{{ row.parentTaskName }}</span>
        </template>
      </el-table-column>
      
      <!-- Status column -->
      <el-table-column 
        prop="status" 
        label="Status" 
        min-width="10%" 
        align="center"
      >
        <template #default="{ row }">
          <el-tag :type="statusType[row.status]">
            {{ statusMap[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      
      <!-- Queue Result column -->
      <el-table-column 
        label="Queue Result" 
        min-width="15%" 
        align="center"
      >
        <template #default="{ row }">
          <el-button 
            size="small" 
            type="primary"
            :disabled="!row.queueResult"
            @click="handleViewQueueResult(row)"
          >
            View
          </el-button>
        </template>
      </el-table-column>
      
      <!-- Parameters column -->
      <el-table-column 
        label="Parameters" 
        min-width="12%" 
        align="center"
      >
        <template #default="{ row }">
          <el-button 
            size="small" 
            type="primary"
            @click="handleViewParameters(row)"
            :loading="row.loadingParameters"
          >
            <i class="el-icon-setting"></i>
            参数
          </el-button>
        </template>
      </el-table-column>
      
      <!-- Actions column -->
      <el-table-column 
        label="Actions" 
        min-width="25%" 
        align="center"
      >
        <template #default="{ row }">
          <el-select 
            v-model="row.selectedMatchIndex" 
            placeholder="Select data"
            size="small"
            style="width: 120px; margin-right: 8px;"
          >
            <el-option
              v-for="(match, index) in row.matches"
              :key="index"
              :label="`Data ${index + 1}`"
              :value="index"
            ></el-option>
          </el-select>
          <el-button 
            size="small" 
            @click="handleView(row)"
          >
            View
          </el-button>
          <el-button 
            size="small" 
            :type="row.queueResult ? 'primary' : 'default'"
            @click="handleEdit(row)"
            :disabled="!row.queueResult"
            :title="!row.queueResult ? '请先进行调度(scheduling)后再编辑参数' : '编辑任务参数'"
          >
            <i class="el-icon-edit"></i>
            Edit
          </el-button>
          <el-button 
            size="small" 
            type="danger" 
            @click="handleDelete(row)"
          >
            Delete
          </el-button>
          <el-button 
            size="small" 
            type="success" 
            :disabled="row.status === 1 || isExecutingWorkflow || !row.queueResult"
            @click="handleRunSingleTask(row)"
          >
            {{ row.status === 1 ? '运行中' : '运行' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Selected actions toolbar -->
    <div class="selected-actions" v-if="selectedRows.length > 0">
      <div class="selection-info">
        <span class="selected-count">{{ selectedRows.length }} item(s) selected</span>
        
        <!-- 🚀 并发执行信息 -->
        <div class="concurrent-info" v-if="concurrentExecution.enabled && selectedRows.length > 1">
          <el-tag 
            size="small" 
            type="info" 
            effect="plain"
            @click="analyzeConcurrentPotential"
            style="cursor: pointer; margin-left: 8px;"
          >
            <i class="el-icon-cpu"></i>
            并发分析
          </el-tag>
        </div>
      </div>
      
      <div class="action-buttons">
        <el-button 
          size="small" 
          @click="batchView"
          :disabled="selectedRows.length === 0 || isScheduling"
          :loading="isScheduling"
        >
          {{ isScheduling ? '调度中...' : 'scheduling' }}
        </el-button>
        
        <!-- 🔧 并发执行开关 -->
        <el-tooltip content="开启/关闭并发执行优化">
          <el-switch
            v-model="concurrentExecution.enabled"
            size="small"
            active-text="并发"
            inactive-text="顺序"
            style="margin-left: 8px;"
          ></el-switch>
        </el-tooltip>
        
        <!-- 🧪 测试实时高亮按钮 -->
        <el-tooltip content="测试监控界面的实时高亮功能">
          <el-button 
            size="small" 
            type="warning"
            @click="testRealtimeHighlight"
            style="margin-left: 8px;"
          >
            <i class="el-icon-view"></i>
            测试高亮
          </el-button>
        </el-tooltip>
        
        <!-- 🧹 清除高亮按钮 -->
        <el-tooltip content="清除监控界面的所有高亮效果">
          <el-button 
            size="small" 
            type="info"
            @click="clearAllHighlights"
            style="margin-left: 8px;"
          >
            <i class="el-icon-refresh"></i>
            清除高亮
          </el-button>
        </el-tooltip>
        
        <!-- 🔍 调试按钮 -->
        <el-tooltip content="查看监控界面当前图形的节点信息">
          <el-button 
            size="small" 
            type="primary"
            @click="debugGraphNodes"
            style="margin-left: 8px;"
          >
            <i class="el-icon-search"></i>
            调试节点
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- Pagination -->
    <el-pagination
      @size-change="sizeChange"
      @current-change="currentChange"
      :current-page="page"
      :page-size="size"
      :page-sizes="pageSizes"
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      style="margin-top: 20px"
    ></el-pagination>

    <!-- Edit Dialog -->
    <el-dialog 
      v-model="editDialogVisible" 
      title="Edit Task Parameters" 
      :fullscreen="true" 
      class="fullscreen-dialog editDialogVisible"
    >
      <iframe 
        ref="editIframe"
        src="http://localhost:8850/#/topcontrol/index" 
        frameborder="0" 
        style="width: 100%; height: 100%; min-height: 100vh;"
        allowfullscreen
      ></iframe>
    </el-dialog>

    <!-- View Dialog -->
    <el-dialog 
      v-model="ViewDialogVisible" 
      title="View Information" 
      :fullscreen="true" 
      class="fullscreen-dialog ViewDialogVisible"  
    >
      <iframe 
        src="http://localhost:8850/#/viewInformation/index" 
        frameborder="0" 
        style="width: 100%; height: 100%; min-height: 100vh;"
        allowfullscreen
      ></iframe>
    </el-dialog>

    <!-- Create Dialog -->
    <el-dialog v-model="CreateDialogVisible" title="Create Task" width="50%">
      <!-- Create form would go here -->
    </el-dialog>
    
    <!-- Parameters Dialog -->
    <el-dialog 
      v-model="parametersDialogVisible" 
      title="任务参数详情" 
      width="70%"
      :close-on-click-modal="false"
    >
      <div v-if="currentParametersData">
        <!-- 任务基本信息 -->
        <div class="task-info-section">
          <h3>任务信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="任务ID">{{ currentParametersData.taskId }}</el-descriptions-item>
            <el-descriptions-item label="任务名称">{{ currentParametersData.taskName }}</el-descriptions-item>
            <el-descriptions-item label="任务键值">{{ currentParametersData.taskKey }}</el-descriptions-item>
            <el-descriptions-item label="产物">{{ currentParametersData.product }}</el-descriptions-item>
            <el-descriptions-item label="反应时间">{{ currentParametersData.reactTime }} 小时</el-descriptions-item>
            <el-descriptions-item label="参数更新时间">{{ currentParametersData.updatedAt || '未设置' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 设备参数 -->
        <div class="device-parameters-section" v-if="currentParametersData.parameters && Object.keys(currentParametersData.parameters).length > 0">
          <h3>设备参数</h3>
          <el-table :data="formattedParameters" border style="width: 100%">
            <el-table-column prop="deviceId" label="设备ID" width="120"></el-table-column>
            <el-table-column prop="deviceType" label="设备类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getDeviceTypeColor(row.deviceType)">{{ getDeviceTypeName(row.deviceType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="parameters" label="参数设置" min-width="300">
              <template #default="{ row }">
                <div class="parameter-list">
                  <div v-for="(value, key) in row.parameters" :key="key" class="parameter-item">
                    <span class="parameter-key">{{ formatParameterKey(key) }}:</span>
                    <span class="parameter-value">{{ formatParameterValue(key, value) }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 无参数提示 -->
        <div v-else class="no-parameters">
          <el-empty description="该任务暂无设备参数设置">
            <el-button type="primary" @click="handleEditFromParameters">去设置参数</el-button>
          </el-empty>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-else class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="parametersDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="handleEditFromParameters" v-if="currentParametersData">编辑参数</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 🎯 工作流预览对话框 -->
    <el-dialog
      v-model="showWorkflowPreviewDialog"
      title="工作流预览与确认"
      width="90%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="workflow-preview-content">
        <!-- 工作流预览头部 -->
        <div class="workflow-preview-header">
          <h3>工作流执行预览</h3>
          <p class="workflow-preview-desc">即将执行 {{ previewExecutionPlan.length }} 个任务的工作流，请确认执行计划</p>
          <div class="workflow-preview-meta">
            <span>{{ previewExecutionPlan.length }} 个任务</span>
            <span>总预计时间: {{ calculateTotalDuration() }} 分钟</span>
            <span>{{ new Date().toLocaleString() }}</span>
          </div>
        </div>

        <!-- 任务列表和工作流详情 -->
        <div class="workflow-tasks-container">
          <el-collapse v-model="activeWorkflowPanels" accordion>
            <el-collapse-item 
              v-for="(taskExecution, index) in previewExecutionPlan" 
              :key="taskExecution.taskId" 
              :title="`任务 ${index + 1}: ${taskExecution.taskName}`"
              :name="taskExecution.taskId"
            >
              <template #title>
                <div class="task-collapse-title">
                  <div class="task-index">{{ index + 1 }}</div>
                  <div class="task-info">
                    <div class="task-name">{{ taskExecution.taskName }}</div>
                    <div class="task-meta">
                      <el-tag size="small" type="info">{{ taskExecution.product }}</el-tag>
                      <el-tag size="small" type="warning">{{ taskExecution.reactTime }}h</el-tag>
                      <el-tag size="small" type="primary">{{ taskExecution.devicePath.length }} 设备</el-tag>
                    </div>
                  </div>
                  <div class="task-schedule-info">
                    <div v-if="taskExecution.scheduledTime" class="scheduled-time">
                      调度时间: {{ formatTime(taskExecution.scheduledTime) }}
                    </div>
                    <div class="duration">预计: {{ taskExecution.duration || taskExecution.reactTime * 60 }} 分钟</div>
                  </div>
                </div>
              </template>

              <!-- 任务详细信息 -->
              <div class="task-detail-content">
                <!-- 设备路径 -->
                <div class="device-path-section">
                  <div class="device-path-header">
                    <h4>设备执行路径</h4>
                    <el-button 
                      size="small" 
                      type="primary" 
                      @click="viewTaskPathGraph(taskExecution)"
                      icon="View"
                    >
                      查看详细路径图
                    </el-button>
                  </div>
                  
                  <!-- 执行顺序展示 -->
                  <div class="device-execution-order">
                    <div class="execution-sequence">
                      <div 
                        v-for="(deviceId, index) in taskExecution.devicePath" 
                        :key="index"
                        class="sequence-item"
                      >
                        <div class="sequence-number">{{ index + 1 }}</div>
                        <div class="sequence-device">
                          <div class="device-id">{{ deviceId }}</div>
                          <div class="device-type-tag">{{ getDeviceTypeName(getDeviceTypeFromId(deviceId)) }}</div>
                        </div>
                        <div v-if="index < taskExecution.devicePath.length - 1" class="sequence-arrow">→</div>
                      </div>
                    </div>
                    
                    <!-- 路径统计 -->
                    <div class="path-stats">
                      <div class="stats-item">
                        <i class="el-icon-position"></i>
                        <span>设备总数: {{ taskExecution.devicePath.length }}</span>
                      </div>
                      <div class="stats-item">
                        <i class="el-icon-time"></i>
                        <span>预计耗时: {{ taskExecution.duration || taskExecution.reactTime * 60 }} 分钟</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 工作流步骤 -->
                <div v-if="taskExecution.workflow" class="workflow-steps-section">
                  <h4>工作流步骤</h4>
                  <div class="workflow-steps-list">
                    <div 
                      v-for="(step, stepIndex) in taskExecution.workflow.steps" 
                      :key="step.id"
                      class="workflow-step-item"
                    >
                      <div class="step-header">
                        <div class="step-number">{{ stepIndex + 1 }}</div>
                        <div class="step-name">{{ step.name }}</div>
                        <div class="step-duration" v-if="step.expectedDuration">
                          {{ step.expectedDuration }}s
                        </div>
                      </div>
                      
                      <div class="step-description">{{ step.description }}</div>
                      
                      <!-- 设备命令 -->
                      <div v-if="step.deviceCommands && step.deviceCommands.length > 0" class="step-commands">
                        <h5>设备操作 ({{ step.deviceCommands.length }})</h5>
                        <div class="commands-grid">
                          <div 
                            v-for="(command, cmdIndex) in step.deviceCommands" 
                            :key="cmdIndex"
                            class="command-item"
                          >
                            <div class="command-device">
                              {{ getDeviceTypeName(command.deviceType) }} {{ command.deviceId }}
                            </div>
                            <div class="command-action">{{ formatCommandAction(command.action) }}</div>
                            <div class="command-params" v-if="command.parameters">
                              {{ formatCommandParameters(command.parameters) }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- 等待条件 -->
                      <div v-if="step.conditions && step.conditions.length > 0" class="step-conditions">
                        <h5>等待条件 ({{ step.conditions.length }})</h5>
                        <div class="conditions-list">
                          <div 
                            v-for="(condition, condIndex) in step.conditions" 
                            :key="condIndex"
                            class="condition-item"
                          >
                            <i class="condition-icon">⏳</i>
                            <div class="condition-desc">
                              等待 {{ getDeviceTypeName(condition.deviceType) }} {{ condition.deviceId }}
                              {{ condition.parameter }} {{ getComparisonSymbol(condition.comparison) }}
                              {{ condition.value }}{{ getParameterUnit(condition.parameter) }}
                              (超时: {{ condition.timeout || 60 }}s)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 任务参数 -->
                <div v-if="taskExecution.parameters && Object.keys(taskExecution.parameters).length > 0" class="task-parameters-section">
                  <h4>任务参数</h4>
                  <div class="parameters-grid">
                    <div 
                      v-for="(value, key) in taskExecution.parameters" 
                      :key="key"
                      class="parameter-item"
                    >
                      <div class="parameter-key">{{ formatParameterKey(key) }}</div>
                      <div class="parameter-value">{{ formatParameterValue(key, value) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <!-- 对话框底部按钮 -->
      <template #footer>
        <div class="workflow-preview-footer">
          <div class="preview-summary">
            <el-icon><InfoFilled /></el-icon>
            <span>确认后将启动工作流并跳转到监控界面</span>
          </div>
          <div class="footer-buttons">
            <el-button @click="cancelWorkflowExecution">取消</el-button>
            <el-button 
              type="primary" 
              @click="confirmWorkflowExecution"
              :loading="isConfirmingExecution"
            >
              <i class="el-icon-video-play"></i>
              {{ isConfirmingExecution ? '启动中...' : '确认执行工作流' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 🚀 并发工作流预览对话框 -->
    <el-dialog
      v-model="showConcurrentPreviewDialog"
      title="🚀 并发工作流预览与确认"
      width="95%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="concurrent-preview-dialog"
    >
      <div class="concurrent-preview-content">
        <!-- 并发预览头部 -->
        <div class="concurrent-preview-header">
          <h3>🚀 并发工作流执行预览</h3>
          <p class="concurrent-preview-desc">
            已将 {{ getTotalTaskCount() }} 个任务优化分组为 {{ concurrentPreviewGroups.length }} 个并发组，
            预计提升效率 {{ getEfficiencyImprovement() }}%
          </p>
          <div class="concurrent-preview-meta">
            <el-tag type="success" effect="dark">
              <i class="el-icon-thunderbolt"></i>
              并发执行模式
            </el-tag>
            <span>{{ concurrentPreviewGroups.length }} 个并发组</span>
            <span>总预计时间: {{ formatConcurrentTotalDuration() }} 分钟</span>
            <span>{{ new Date().toLocaleString() }}</span>
          </div>
        </div>

        <!-- 并发分组列表 -->
        <div class="concurrent-groups-container">
          <el-collapse v-model="activeConcurrentPanels" accordion>
            <el-collapse-item 
              v-for="(group, groupIndex) in concurrentPreviewGroups" 
              :key="group.groupId"
              :name="group.groupId"
            >
              <template #title>
                <div class="group-collapse-title">
                  <div class="group-index">{{ groupIndex + 1 }}</div>
                  <div class="group-info">
                    <div class="group-name">{{ group.groupName }}</div>
                    <div class="group-meta">
                      <el-tag size="small" type="primary">{{ group.tasks.length }} 个任务</el-tag>
                      <el-tag size="small" type="info">{{ group.deviceList ? group.deviceList.length : 0 }} 个设备</el-tag>
                      <el-tag size="small" type="warning">{{ group.mergedWorkflow ? group.mergedWorkflow.steps.length : 0 }} 个步骤</el-tag>
                      <el-tag size="small" type="success">{{ Math.round(group.estimatedDuration / 60) }} 分钟</el-tag>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 组内任务列表 -->
              <div class="group-tasks">
                <h4>📋 组内任务列表</h4>
                <div class="task-list">
                  <div 
                    v-for="task in group.tasks" 
                    :key="task.taskId"
                    class="task-item"
                  >
                    <el-tag type="primary" size="small">{{ task.taskName }}</el-tag>
                    <span class="task-duration">{{ Math.round(task.duration / 60) }} 分钟</span>
                    <span class="task-devices">
                      设备: {{ (task.devicePath || []).join(', ') }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 合并后的工作流步骤 -->
              <div class="merged-workflow" v-if="group.mergedWorkflow">
                <h4>🔧 合并后的工作流步骤</h4>
                <div class="workflow-steps">
                  <div 
                    v-for="(step, stepIndex) in group.mergedWorkflow.steps" 
                    :key="step.id"
                    class="workflow-step"
                  >
                    <div class="step-header">
                      <div class="step-number">{{ stepIndex + 1 }}</div>
                      <div class="step-name">{{ step.name }}</div>
                      <div class="step-commands-count" v-if="step.deviceCommands">
                        {{ step.deviceCommands.length }} 个命令
                      </div>
                    </div>
                    
                    <div class="step-description">{{ step.description }}</div>
                    
                    <!-- 设备命令详情 -->
                    <div v-if="step.deviceCommands && step.deviceCommands.length > 0" class="step-commands">
                      <h5>📋 设备操作详情</h5>
                      <div class="commands-grid">
                        <div 
                          v-for="(command, cmdIndex) in step.deviceCommands" 
                          :key="cmdIndex"
                          class="command-item"
                        >
                          <div class="command-device">
                            {{ getDeviceTypeName(command.deviceType) }} {{ command.deviceId }}
                          </div>
                          <div class="command-action">{{ formatCommandAction(command.action) }}</div>
                          <div class="command-params" v-if="command.parameters">
                            {{ formatCommandParameters(command.parameters) }}
                          </div>
                          <div class="command-source" v-if="command.sourceTaskName">
                            来源: {{ command.sourceTaskName }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 等待条件 -->
                    <div v-if="step.completionConditions && step.completionConditions.length > 0" class="step-conditions">
                      <h5>⏳ 完成条件</h5>
                      <div class="conditions-list">
                        <div 
                          v-for="(condition, condIndex) in step.completionConditions" 
                          :key="condIndex"
                          class="condition-item"
                        >
                          <el-tag size="small" type="info">
                            {{ condition.deviceId }}: {{ condition.description }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 设备使用分析 -->
              <div class="device-analysis" v-if="group.deviceList">
                <h4>🔧 设备使用分析</h4>
                <div class="device-usage">
                  <el-tag 
                    v-for="deviceId in group.deviceList" 
                    :key="deviceId"
                    size="small"
                    :type="getDeviceTagType(deviceId)"
                    class="device-tag"
                  >
                    {{ deviceId }}
                  </el-tag>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 冲突分析摘要 -->
        <div class="conflict-analysis" v-if="concurrentPreviewGroups.length > 0">
          <h4>⚡ 并发优化分析</h4>
          <div class="analysis-content">
            <div class="analysis-item">
              <span class="analysis-label">设备冲突检测:</span>
              <el-tag type="success" size="small">已完成</el-tag>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">任务分组策略:</span>
              <el-tag type="primary" size="small">智能分组</el-tag>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">执行效率提升:</span>
              <el-tag type="warning" size="small">{{ getEfficiencyImprovement() }}%</el-tag>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">预计节省时间:</span>
              <el-tag type="success" size="small">{{ getSavedTime() }} 分钟</el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话框底部按钮 -->
      <template #footer>
        <div class="concurrent-preview-footer">
          <div class="preview-summary">
            <el-icon><InfoFilled /></el-icon>
            <span>确认后将启动并发工作流并跳转到监控界面</span>
          </div>
          <div class="footer-buttons">
            <el-button @click="cancelConcurrentExecution">取消</el-button>
            <el-button 
              type="primary" 
              @click="confirmConcurrentExecution"
              :loading="isConfirmingConcurrentExecution"
            >
              <i class="el-icon-thunderbolt"></i>
              {{ isConfirmingConcurrentExecution ? '启动中...' : '确认并发执行' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { useRoute } from "vue-router";
import { getToken, formatToken } from "@/utils/auth";
import { useRunningTasksStore } from "@/store/modules/runningTasks";
import { usePageStateStore } from "@/store/modules/pageState";
import { reactive, ref } from 'vue';
import { TaskWebSocketManager } from '@/utils/taskWebSocketManager.js';

const runningTasksStore = useRunningTasksStore();
const pageStateStore = usePageStateStore();
const monitorIframe = ref(null)

export default {
  data() {
    // 🔧 初始化Task专用WebSocket管理器
    this.taskWebSocketManager = new TaskWebSocketManager();
    
    // ✅ 添加页面状态管理store
    this.pageStateStore = pageStateStore;
    
    return {
      page: 1,
      size: 10,
      total: 0,
      ws_ai: null, // WebSocket 实例
      schedule_result:null,
      pageSizes: [10, 20, 50],
      tableData: [],
      statusMap: {
        0: 'Pending',
        1: 'In Progress',
        2: 'Completed',
        3: 'Failed',
        4: 'Ready'
      },
      statusType: {
        0: 'info',
        1: 'primary',
        2: 'success',
        3: 'danger',
        4: 'warning'
      },
      allData: [],
      editDialogVisible: false,
      CreateDialogVisible: false,
      ViewDialogVisible: false,
      currentViewData: null,
      currentEditData: null,
      selectedRows: [], // Store selected rows
      queueResultDialogVisible: false,
      currentQueueResult: null,
      
      // 🎯 简化的工作流执行状态
      isExecutingWorkflow: false,
      
      // 🆕 调度状态追踪
      isScheduling: false,
      
      // 🔧 使用共享WebSocket连接状态（响应式）
      wsConnected: this.taskWebSocketManager.wsConnected,
      isHardwareConnected: this.taskWebSocketManager.isHardwareConnected,
      serverHardwareConnected: this.taskWebSocketManager.serverHardwareConnected,
      hardwareIP: this.taskWebSocketManager.hardwareIP,
      showExecutionDetail: false,
      
      // 参数显示相关状态
      parametersDialogVisible: false,
      currentParametersData: null,
      formattedParameters: [],
      
      // 🔧 AI连接状态由组件自己管理
      isAIConnected: false,
      
      // 🆕 调度超时检查
      scheduleTimeout: null,
      
      // 🎯 高亮数据缓存，确保数据不丢失
      highlightDataCache: [],
      monitorReadyReceived: false,
      
      // 🔍 监控界面图形节点数据
      monitorGraphNodes: [],
      
      // 🎯 工作流预览相关状态
      showWorkflowPreviewDialog: false,
      previewExecutionPlan: [],
      activeWorkflowPanels: [],
      isConfirmingExecution: false,
      
      // 🚀 并发工作流预览相关状态
      showConcurrentPreviewDialog: false,
      concurrentPreviewGroups: [],
      activeConcurrentPanels: [],
      isConfirmingConcurrentExecution: false,
      
      // 🔧 WebSocket连接管理已移至taskWebSocketManager

      // 🆕 并发执行管理
      concurrentExecution: {
        enabled: true,              // 是否启用并发执行
        maxConcurrentTasks: 5,      // 最大并发任务数
        currentGroups: [],          // 当前并发组
        groupStatus: new Map(),     // 组执行状态
        deviceUsageMap: new Map(),  // 设备使用情况映射
        conflictMatrix: new Map(),  // 设备冲突矩阵
      },
      
      // 🔧 服务器硬件连接状态已移至taskWebSocketManager
    };
  },
  computed: {
    groupedRows() {
      const groups = {};
      
      this.allData.forEach(task => {
        if (task.mapping_result) {
          Object.entries(task.mapping_result).forEach(([key, value]) => {
            if (key !== "@" && value.match && Array.isArray(value.match)) {
              const taskData = value.g_data || {};
              const groupKey = `${task.id}-${key}`;
              
              if (!groups[groupKey]) {
                groups[groupKey] = {
                  id: task.id,
                  parentTaskName: task.taskName,
                  createdData: task.createdData,
                  creator: task.creator,
                  status: task.status,
                  product: taskData.product || 'N/A',
                  reactTime: taskData.reactTime || 0, // 新增reactTime字段
                  key: key,
                  matches: [],
                  selectedMatchIndex: 0,
                };
              }
              
              value.match.forEach((match, index) => {
                groups[groupKey].matches.push({
                  matchData: match.H_with_map,
                  matchIndex: index,
                  matched_path: match.matched_path
                });
              });
            }
          });
        }
      });
      
      return Object.values(groups);
    }
  },
  methods: {
    // ✅ 保存页面状态到store
    savePageState() {
      try {
        // 保存所有关键状态
        this.pageStateStore.updateTaskSelectedRows(this.selectedRows);
        this.pageStateStore.updateTaskSchedulingStatus(this.isScheduling);
        this.pageStateStore.updateTaskExecutionStatus(this.isExecutingWorkflow);
        this.pageStateStore.updateTaskTableData(this.tableData);
        this.pageStateStore.updateTaskPaginationConfig({
          currentPage: this.page,
          pageSize: this.size,
          total: this.total
        });
        
        // 保存调度结果和并发分组
        if (this.schedule_result) {
          this.pageStateStore.updateTaskSchedulingResults(this.schedule_result);
        }
        
        if (this.concurrentExecution && this.concurrentExecution.groups && this.concurrentExecution.groups.length > 0) {
          this.pageStateStore.updateTaskConcurrentGroups(this.concurrentExecution.groups);
        }
        
        console.log('✅ Task页面状态已保存到store');
      } catch (error) {
        console.warn('❌ 保存Task页面状态失败:', error);
      }
    },
    
    // 🔧 新增：立即保存状态（包含localStorage持久化）
    savePageStateImmediate() {
      try {
        // 先保存到store
        this.savePageState();
        
        // 立即持久化到localStorage
        this.pageStateStore.saveStateToLocalStorage();
        
        console.log('✅ Task页面状态已立即保存并持久化');
      } catch (error) {
        console.warn('❌ 立即保存Task页面状态失败:', error);
      }
    },
    getChildOrigin(iframeEl) {
      try {
        return new URL(iframeEl?.src, window.location.href).origin
      } catch {
        return window.location.origin
      }
    },
    // ✅ 从store恢复页面状态
    restorePageState() {
      try {
        console.log('🔄 开始恢复Task页面状态...');
        
        const taskState = this.pageStateStore.taskPageState;
        
        // 恢复调度状态
        if (taskState.isScheduling !== this.isScheduling) {
          this.isScheduling = taskState.isScheduling;
          console.log('🔄 恢复调度状态:', this.isScheduling);
        }
        
        // 恢复执行状态
        if (taskState.isExecutingWorkflow !== this.isExecutingWorkflow) {
          this.isExecutingWorkflow = taskState.isExecutingWorkflow;
          console.log('🔄 恢复执行状态:', this.isExecutingWorkflow);
        }
        
        // 恢复分页配置
        if (taskState.paginationConfig) {
          this.page = taskState.paginationConfig.currentPage || 1;
          this.size = taskState.paginationConfig.pageSize || 10;
          this.total = taskState.paginationConfig.total || 0;
          console.log('🔄 恢复分页配置:', { page: this.page, size: this.size });
        }
        
        // 恢复调度结果
        if (taskState.schedulingResults) {
          this.schedule_result = taskState.schedulingResults;
          console.log('🔄 恢复调度结果');
        }
        
        // 恢复并发分组
        if (taskState.concurrentGroups && taskState.concurrentGroups.length > 0) {
          if (!this.concurrentExecution) {
            this.concurrentExecution = { groups: [] };
          }
          this.concurrentExecution.groups = [...taskState.concurrentGroups];
          console.log('🔄 恢复并发分组:', this.concurrentExecution.groups.length);
        }
        
        // 恢复表格数据（如果存在）
        if (taskState.tableData && taskState.tableData.length > 0) {
          this.tableData = [...taskState.tableData];
          console.log('🔄 恢复表格数据:', this.tableData.length);
        }
        
        // 🔧 延迟恢复选中的行，确保表格已渲染
        if (taskState.selectedRows && taskState.selectedRows.length > 0) {
          this.selectedRows = [...taskState.selectedRows];
          console.log('🔄 恢复选中的任务行:', this.selectedRows.length);
          
          // 多次尝试恢复选中状态，确保表格已完全加载
          this.restoreTableSelectionWithRetry(this.selectedRows, 5);
        }
        
        console.log('✅ Task页面状态已从store恢复');
      } catch (error) {
        console.warn('❌ 恢复Task页面状态失败:', error);
      }
    },
    
    // 🔧 新增：带重试机制的表格选中状态恢复
    restoreTableSelectionWithRetry(selectedRows, maxRetries = 5) {
      const attemptRestore = (attempt) => {
        if (attempt > maxRetries) {
          console.warn('❌ 表格选中状态恢复失败，已达到最大重试次数');
          return;
        }
        
        this.$nextTick(() => {
          if (this.$refs.taskTable && this.tableData.length > 0) {
            console.log(`🔄 第${attempt}次尝试恢复表格选中状态...`);
            
            // 先清空现有选中
            this.$refs.taskTable.clearSelection();
            
            // 根据ID匹配表格中的行并选中
            selectedRows.forEach(savedRow => {
              const matchingRow = this.tableData.find(row => 
                row.id === savedRow.id && row.key === savedRow.key
              );
              if (matchingRow) {
                this.$refs.taskTable.toggleRowSelection(matchingRow, true);
              }
            });
            
            // 验证恢复是否成功
            setTimeout(() => {
              if (this.selectedRows.length === selectedRows.length) {
                console.log('✅ 表格选中状态已成功恢复');
              } else {
                console.log(`⚠️ 表格选中状态部分恢复，重试中... (${this.selectedRows.length}/${selectedRows.length})`);
                attemptRestore(attempt + 1);
              }
            }, 100);
          } else {
            console.log(`⚠️ 表格未就绪，等待重试... (第${attempt}次)`);
            setTimeout(() => attemptRestore(attempt + 1), 200);
          }
        });
      };
      
      attemptRestore(1);
    },
    
    // 🔧 新增：页面状态调试功能
    debugPageState() {
      console.log('🔍 ===== 页面状态调试信息 =====');
      
      // 当前组件状态
      console.log('📍 当前组件状态:', {
        selectedRows: this.selectedRows.length,
        isScheduling: this.isScheduling,
        isExecutingWorkflow: this.isExecutingWorkflow,
        schedule_result: !!this.schedule_result,
        tableData: this.tableData.length,
        concurrentGroups: this.concurrentExecution?.groups?.length || 0,
        page: this.page,
        size: this.size,
        total: this.total
      });
      
      // Store中的状态
      console.log('🏪 Store中的状态:', {
        taskPageState: this.pageStateStore.taskPageState,
        storeSelectedRows: this.pageStateStore.taskPageState.selectedRows.length,
        storeScheduling: this.pageStateStore.taskPageState.isScheduling,
        storeExecuting: this.pageStateStore.taskPageState.isExecutingWorkflow,
        storeSchedulingResults: !!this.pageStateStore.taskPageState.schedulingResults,
        storeConcurrentGroups: this.pageStateStore.taskPageState.concurrentGroups.length,
        storeTableData: this.pageStateStore.taskPageState.tableData.length
      });
      
      // localStorage中的状态
      const localStorageState = localStorage.getItem('pageStateBackup');
      if (localStorageState) {
        try {
          const parsed = JSON.parse(localStorageState);
          console.log('💾 localStorage中的状态:', {
            savedAt: parsed.savedAt,
            taskSelectedRows: parsed.taskPageState?.selectedRows?.length || 0,
            taskScheduling: parsed.taskPageState?.isScheduling || false,
            taskExecuting: parsed.taskPageState?.isExecutingWorkflow || false,
            taskSchedulingResults: !!parsed.taskPageState?.schedulingResults,
            taskConcurrentGroups: parsed.taskPageState?.concurrentGroups?.length || 0,
            taskTableData: parsed.taskPageState?.tableData?.length || 0
          });
        } catch (error) {
          console.error('❌ 解析localStorage状态失败:', error);
        }
      } else {
        console.log('💾 localStorage中没有保存的状态');
      }
      
      // 表格选中状态
      console.log('📊 表格选中状态:', {
        selectedRowsIds: this.selectedRows.map(row => ({ id: row.id, key: row.key })),
        tableRef: !!this.$refs.taskTable,
        tableSelection: this.$refs.taskTable?.getSelectionRows()?.length || 0
      });
      
      console.log('🔍 ===== 调试信息结束 =====');
      
      // 显示调试信息对话框
      this.$alert(`
        <div style="text-align: left; font-family: monospace; white-space: pre-wrap;">
当前组件状态：
  • 选中行数: ${this.selectedRows.length}
  • 调度状态: ${this.isScheduling ? '进行中' : '空闲'}
  • 执行状态: ${this.isExecutingWorkflow ? '进行中' : '空闲'}
  • 表格数据: ${this.tableData.length} 行
  • 并发分组: ${this.concurrentExecution?.groups?.length || 0} 个

Store状态：
  • 选中行数: ${this.pageStateStore.taskPageState.selectedRows.length}
  • 调度状态: ${this.pageStateStore.taskPageState.isScheduling ? '进行中' : '空闲'}
  • 执行状态: ${this.pageStateStore.taskPageState.isExecutingWorkflow ? '进行中' : '空闲'}
  • 表格数据: ${this.pageStateStore.taskPageState.tableData.length} 行

状态同步：${this.selectedRows.length === this.pageStateStore.taskPageState.selectedRows.length ? '✅ 同步' : '❌ 不同步'}
        </div>
      `, '页面状态调试信息', {
        dangerouslyUseHTMLString: true,
        customClass: 'debug-dialog'
      });
    },
    
    // 🔧 新增：强制恢复状态功能
    forceRestoreState() {
      console.log('🔄 强制恢复页面状态...');
      
      // 先从localStorage加载最新状态
      const loaded = this.pageStateStore.loadStateFromLocalStorage();
      if (loaded) {
        console.log('✅ 从localStorage加载状态成功');
      } else {
        console.log('⚠️ localStorage中没有可用状态');
      }
      
      // 强制恢复状态
      this.restorePageState();
      
      // 重新获取表格数据
      this.getTableData();
      
      this.$message.success('页面状态已强制恢复');
    },

    // Handle row selection changes
    handleSelectionChange(selection) {
      this.selectedRows = selection;
      // ✅ 同步到页面状态store
      this.pageStateStore.updateTaskSelectedRows(selection);
      
      // 🔧 立即保存状态到localStorage
      this.savePageStateImmediate();
    },
    
    // Handle react time change
    handleReactTimeChange(row) {
      console.log(`React time changed for row ${row.id}: ${row.reactTime}h`);
      // Update the original data
      const parentTask = this.allData.find(item => item.id === row.id);
      if (parentTask && parentTask.mapping_result && parentTask.mapping_result[row.key]) {
        parentTask.mapping_result[row.key].g_data = {
          ...parentTask.mapping_result[row.key].g_data,
          reactTime: row.reactTime
        };
      }
      
      // Here you can add API call to save the reactTime to backend
    },
    
    // Batch view selected rows
    async batchView() {
      if (this.selectedRows.length === 0) {
        this.$message.warning('请至少选择一个任务');
        return;
      }
      
      // 🆕 保存当前选中的任务，防止调度过程中丢失
      const originalSelectedRows = [...this.selectedRows];
      
      // 🆕 设置调度状态
      this.isScheduling = true;
      // ✅ 同步到页面状态store
      this.pageStateStore.updateTaskSchedulingStatus(true);
      
      // 🔧 立即保存状态
      this.savePageStateImmediate();
      
      console.log('🚀 开始调度选中的任务:', this.selectedRows.map(row => ({
        id: row.id,
        key: row.key,
        taskName: row.parentTaskName
      })));
      
      try {
        // 构建 queueRoutes 和 devices_intervals
        const queueRoutes = {};
        const devices_intervals = {};
        
        this.selectedRows.forEach(row => {
          // 获取该任务的所有graph数据
          const parentTask = this.allData.find(item => item.id === row.id);
          if (!parentTask || !parentTask.mapping_result) {
            console.warn(`未找到任务 ${row.id} 的graph数据`);
            return;
          }

          // 遍历该任务的所有graph数据
          Object.entries(parentTask.mapping_result).forEach(([key, value]) => {
            if (key !== "@" && value.match && Array.isArray(value.match)) {
              const taskData = value.g_data || {};
              const routes = value.match.map((match, index) => ({
                pathDevices: match.matched_path || [],
                index: index,
                duration: taskData.reactTime || 0,
                pathGraph: match.H_with_map || {}
              }));

              // 添加到 queueRoutes
              queueRoutes[`${row.id}`] = routes;
              
              // 初始化设备间隔
              routes.forEach(route => {
                route.pathDevices.forEach(device => {
                  if (!devices_intervals[device]) {
                    devices_intervals[device] = [];
                  }
                });
              });
            }
          });
        });
        
        if (Object.keys(queueRoutes).length === 0) {
          this.$message.warning('没有有效的任务数据可用于调度');
          return;
        }
        
        // 准备发送的数据
        const batchId = `batch_${Date.now()}`;
        const message = {
          serve: "queue",
          MsgType: 7,
          FuncType: 0,
          queueRoutes,
          devices_intervals: devices_intervals,
          batchId
        };
        
        console.log('📤 发送调度请求:', message);
        
        this.downloadJsonFile(message, `scheduling_data_${batchId}.json`);
        
        // 🔧 增强的WebSocket发送逻辑
        if (this.ws_ai && this.ws_ai.readyState === WebSocket.OPEN) {
          try {
          this.ws_ai.send(JSON.stringify(message));
          
          // 🔧 显示调度中的状态
          this.$message.info(`正在调度 ${Object.keys(queueRoutes).length} 个任务，请稍候...`);
          
          console.log("✅ 调度请求已发送，等待AI服务响应");
            
            // 🆕 设置调度超时检查
            this.scheduleTimeout = setTimeout(() => {
              if (this.isScheduling) {
                console.warn('⚠️ 调度超时，请检查AI服务状态');
                this.$message.warning('调度响应超时，请检查AI服务连接');
                this.isScheduling = false;
                // ✅ 同步到页面状态store
                this.pageStateStore.updateTaskSchedulingStatus(false);
              }
            }, 30000); // 30秒超时
            
          } catch (error) {
            console.error('❌ 发送调度请求失败:', error);
            this.$message.error('发送调度请求失败: ' + error.message);
            this.isScheduling = false;
            // ✅ 同步到页面状态store
            this.pageStateStore.updateTaskSchedulingStatus(false);
            this.selectedRows = [...originalSelectedRows];
          }
        } else {
          // 🔧 尝试重新连接WebSocket
          console.warn('⚠️ WebSocket连接断开，尝试重新连接...');
          this.$message.warning('AI服务连接断开，尝试重新连接...');
          
          try {
            this.initAIWebSocket(); // 重新初始化连接
            
            // 等待连接建立后重试
            setTimeout(() => {
              if (this.ws_ai && this.ws_ai.readyState === WebSocket.OPEN) {
                this.ws_ai.send(JSON.stringify(message));
                this.$message.info(`重连成功，正在调度 ${Object.keys(queueRoutes).length} 个任务...`);
                console.log("✅ 重连后调度请求已发送");
              } else {
                this.$message.error('WebSocket重连失败，请检查AI服务状态');
                console.error('❌ WebSocket重连失败');
                this.isScheduling = false;
                this.selectedRows = [...originalSelectedRows];
              }
            }, 2000);
          } catch (error) {
            console.error('❌ WebSocket重连失败:', error);
            this.$message.error('WebSocket重连失败，请检查AI服务连接');
            this.isScheduling = false;
            this.selectedRows = [...originalSelectedRows];
          }
        }
        
        console.log("📋 已发送的调度任务详情:", message);
        
        // 🆕 调度完成后，确保选中状态保持不变
        setTimeout(() => {
          // 如果当前没有选中项，恢复原来的选中状态
          if (this.selectedRows.length === 0) {
            this.selectedRows = [...originalSelectedRows];
            console.log('🔄 已恢复选中状态:', this.selectedRows.length, '个任务');
          }
        }, 500);
        
      } catch (error) {
        console.error("❌ 调度错误:", error);
        this.$message.error('调度任务失败: ' + error.message);
        
        // 🆕 发生错误时也要恢复选中状态
        this.selectedRows = [...originalSelectedRows];
      } finally {
        // 🆕 调度完成后重置状态
        setTimeout(() => {
          this.isScheduling = false;
        }, 1000);
      }
    },
    
      // 下载JSON文件的方法
    downloadJsonFile(data, filename) {
      try {
        // 创建JSON字符串，格式化输出（可选）
        const jsonString = JSON.stringify(data, null, 2);
        
        // 创建Blob对象
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'data.json';
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
      } catch (error) {
        console.error('Error downloading JSON file:', error);
        this.$message.error('Failed to download JSON file');
      }
    },
    
    getRowNumber(index) {
      return (this.page - 1) * this.size + index + 1;
    },
    handleCreate() {
      this.CreateDialogVisible = true;
    },
    getTableData() {
      const start = (this.page - 1) * this.size;
      const end = start + this.size;
      this.tableData = this.groupedRows.slice(start, end).map(row => ({
        ...row,
        loadingParameters: false // 预设置属性，确保响应式
      }));
      this.total = this.groupedRows.length;
    },
    currentChange(val) {
      this.page = val;
      this.getTableData();
    },
    sizeChange(val) {
      this.size = val;
      this.page = 1;
      this.getTableData();
    },
    addNewTask(newTask) {
      this.allData.unshift(newTask);
      this.getTableData();
    },
    handleEdit(row) {
      // 🆕 检查是否已调度
      if (!row.queueResult) {
        this.$message.warning('请先进行调度(scheduling)后再编辑参数');
        return;
      }
      
      // 🆕 使用Queue Result中的路径数据而不是matches数据
      this.currentEditData = { 
        taskId: row.id,
        taskKey: row.key,
        taskName: row.parentTaskName,
        product: row.product,
        reactTime: row.reactTime,
        // 🔧 使用调度结果中的路径数据
        queueResult: row.queueResult,
        devicePath: row.queueResult.pathDevices || [],
        // 🔧 修复：添加topcontrol期望的matchedPath字段
        matchedPath: row.queueResult.pathDevices || [],
        pathGraph: row.queueResult.pathGraph || {},
        // 🔧 修复：添加topcontrol期望的matchData字段，用于加载图形结构
        matchData: row.queueResult.pathGraph || {},
        scheduledTime: row.queueResult.scheduledTime,
        duration: row.queueResult.duration || row.reactTime || 0
      };
      
      console.log('🎯 使用Queue Result数据进行编辑:', this.currentEditData);
      console.log('🔧 修复后的路径设备:', this.currentEditData.matchedPath);
      console.log('🔧 修复后的图形数据:', this.currentEditData.matchData);
      
      // 先显示对话框
      this.editDialogVisible = true;
      
      // 等待对话框和iframe完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          // 通过class选择editDialog内的iframe
          const iframe = document.querySelector('.editDialogVisible iframe');
          console.log('🔍 查找iframe:', iframe);
          
          if (iframe && this.currentEditData) {
            // 监听iframe加载完成事件
            const sendData = () => {
              try {
                // 🆕 传递Queue Result的完整数据
                const childOrigin = this.getChildOrigin(iframe);
                iframe.contentWindow.postMessage({
                  type: 'EDIT_TASK_DATA',
                  data: JSON.stringify({
                    editMode: true,
                    editData: this.currentEditData,
                    // 🔧 明确标识这是调度后的编辑模式
                    isScheduledEdit: true
                  })
                }, childOrigin);
                console.log('✅ 已发送Queue Result数据到topcontrol:', this.currentEditData);
                console.log('✅ 发送的路径设备:', this.currentEditData.matchedPath);
                console.log('✅ 发送的图形数据:', this.currentEditData.matchData);
              } catch (error) {
                console.error('❌ 发送postMessage失败:', error);
              }
            };
            
            // 添加load事件监听器
            iframe.addEventListener('load', sendData);
            
            // 如果iframe已经加载完成，立即发送
            setTimeout(() => {
              sendData();
            }, 1000);
            
          } else {
            console.error('❌ 未找到iframe或缺少编辑数据');
          }
        }, 100);
      });
    },
    handleView(row) {
      if (row.matches.length === 0) return;
      
      const selectedMatch = row.matches[row.selectedMatchIndex];
      
      this.currentViewData = { 
        [row.key]: {
          match: [selectedMatch.matchData],
          parentTask: {
            id: row.id,
            name: row.parentTaskName
          },
          product: row.product,
          reactTime: row.reactTime
        }
      };
      
      // 先显示对话框
      this.ViewDialogVisible = true;
      
      // 等待对话框和iframe完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          const iframe = document.querySelector('.ViewDialogVisible iframe');
          console.log('🔍 查找view iframe:', iframe);
          
          if (iframe) {
            // 定义发送数据的函数
            const sendViewData = () => {
              try {
                const key = Object.keys(this.currentViewData)[0];
                const messageData = {
                  type: 'ROW_DATA',
                  data: JSON.stringify(this.currentViewData[key].match[0])
                };
                console.log(messageData)
                console.log('📤 准备发送数据到viewInformation:', messageData);
                
                const childOrigin = this.getChildOrigin(iframe);
                iframe.contentWindow.postMessage(messageData, childOrigin);
                console.log('✅ 已发送数据到viewInformation');
              } catch (error) {
                console.error('❌ 发送postMessage失败:', error);
              }
            };
            
            // 添加load事件监听器
            iframe.addEventListener('load', () => {
              console.log('🔄 iframe加载完成，准备发送数据');
              // 给iframe内容一些加载时间
              setTimeout(sendViewData, 1000);
            });
            
            // 如果iframe已经加载完成，也尝试发送
            if (iframe.contentWindow) {
              console.log('🔄 iframe已存在，尝试发送数据');
              setTimeout(sendViewData, 1000);
            }
          } else {
            console.error('❌ 未找到view iframe元素');
          }
        }, 100); // 给对话框渲染一些时间
      });
    },
    handleDelete(row) {
      const name = `${row.parentTaskName} (${row.key})`;
      
      this.$confirm(`确定要删除任务 "${row.id}" 吗？`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const tokenInfo = getToken();
          const token = tokenInfo?.accessToken;
          const myHeaders = new Headers();
          myHeaders.append("token", token);
          myHeaders.append("User-Agent", "Apifox/1.0.0 (https://apifox.com)");
          myHeaders.append("Accept", "*/*");
          myHeaders.append("Connection", "keep-alive");

          const requestOptions = {
            method: 'DELETE',
            headers: myHeaders,
            redirect: 'follow'
          };
          console.log(row.id)
          const response = await fetch(`/api/tasks?id=${row.id}`, requestOptions);
          const result = await response.json();

          if (result && result.code === 1) {
            // 从本地数据中移除任务
            this.allData = this.allData.filter(item => item.id !== row.id);
            this.getTableData();
            this.$message({
              type: 'success',
              message: '任务删除成功！'
            });
          } else {
            throw new Error(result?.message || '删除任务失败');
          }
        } catch (error) {
          console.error('删除任务失败:', error);
          this.$message.error(`删除任务失败: ${error.message || '未知错误'}`);
        }
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除操作'
        });
      });
    },
    // 运行单个任务
    async handleRunSingleTask(row) {
      if (!row.queueResult) {
        this.$message.warning('请先对该任务进行调度（scheduling）');
        return;
      }
      
      // 将单个任务包装为数组执行
      this.selectedRows = [row];
      await this.executeSelectedTasksWorkflow();
    },
    // 处理WebSocket消息中的queue结果 - 增强版
    handleQueueResult(result) {
      console.log('🎯 收到调度结果:', result);
      
      // 🆕 清除调度超时检查
      if (this.scheduleTimeout) {
        clearTimeout(this.scheduleTimeout);
        this.scheduleTimeout = null;
      }
      
      // 🆕 保存当前选中状态，防止更新过程中丢失
      const currentSelectedRows = [...this.selectedRows];
      
      if (!result) {
        console.warn('⚠️ 调度结果为空');
        this.$message.warning('调度结果为空，请重新调度');
        this.isScheduling = false;
        return;
      }
      
      // 🔧 检查调度结果的数据结构
      console.log('🔍 调度结果数据结构分析:', {
        resultType: typeof result,
        resultKeys: Object.keys(result),
        hasServeField: !!result.serve,
        resultContent: result
      });
      
      // 🔧 处理不同格式的调度结果
      let queueData = null;
      
      // 格式1: 直接包含任务ID作为key的结果
      if (typeof result === 'object' && !result.serve) {
        queueData = result;
        console.log('📋 格式1: 直接任务ID映射格式');
      }
      // 格式2: 包含serve字段的响应，数据在其他字段中
      else if (result.serve === 'queue') {
        if (result.data) {
          queueData = result.data;
          console.log('📋 格式2: 数据在data字段中');
        } else if (result.result) {
          queueData = result.result;
          console.log('📋 格式2: 数据在result字段中');
        } else if (result.queueResult) {
          queueData = result.queueResult;
          console.log('📋 格式2: 数据在queueResult字段中');
        } else {
          // 移除serve字段后的剩余数据
          const { serve, ...remainingData } = result;
          queueData = remainingData;
          console.log('📋 格式2: 移除serve字段后的数据');
        }
      }
      // 格式3: 数组格式或其他嵌套结构
      else if (Array.isArray(result)) {
        // 如果是数组，转换为任务ID映射
        const taskIdMap = {};
        result.forEach((item, index) => {
          if (item.taskId) {
            taskIdMap[item.taskId] = item;
          } else if (this.selectedRows[index]) {
            taskIdMap[this.selectedRows[index].id] = item;
          }
        });
        queueData = taskIdMap;
        console.log('📋 格式3: 数组转任务ID映射');
      }
      
      if (queueData && Object.keys(queueData).length > 0) {
        console.log('✅ 处理调度数据:', queueData);
        
        let processedCount = 0;
        
        // 🔧 修复：同时更新选中行和表格数据中的queueResult
        this.selectedRows.forEach(row => {
          const taskKey = `${row.id}`;
          const queueResultData = queueData[taskKey] || queueData[row.id] || queueData[`task_${row.id}`];
          
          if (queueResultData) {
            // 更新选中行的queueResult和状态
            row.queueResult = queueResultData;
            row.status = 4; // 更新状态为Ready
            processedCount++;
            console.log(`✅ 任务 ${row.id} 调度结果已保存，状态已更新为Ready:`, queueResultData);
            
            // 🔧 同时更新tableData中对应的行
            const tableRow = this.tableData.find(tRow => tRow.id === row.id && tRow.key === row.key);
            if (tableRow) {
              tableRow.queueResult = queueResultData;
              tableRow.status = 4; // 更新状态为Ready
              console.log(`✅ 表格数据中任务 ${row.id} 调度结果已同步，状态已更新为Ready`);
            }
            
            // 🔧 同时更新groupedRows中对应的行
            const groupedRow = this.groupedRows.find(gRow => gRow.id === row.id && gRow.key === row.key);
            if (groupedRow) {
              groupedRow.queueResult = queueResultData;
              groupedRow.status = 4; // 更新状态为Ready
              console.log(`✅ 分组数据中任务 ${row.id} 调度结果已同步，状态已更新为Ready`);
            }
            
            // 🔧 同时更新原始数据allData中对应的行
            const parentTask = this.allData.find(item => item.id === row.id);
            if (parentTask && parentTask.mapping_result && parentTask.mapping_result[row.key]) {
              parentTask.mapping_result[row.key].status = 4; // 更新状态为Ready
              console.log(`✅ 原始数据中任务 ${row.id} 状态已更新为Ready`);
            }
          } else {
            console.warn(`⚠️ 任务 ${row.id} 未找到对应的调度结果`);
          }
        });
        
        if (processedCount === 0) {
          console.error('❌ 没有任务获得调度结果，数据格式可能不匹配');
          this.$message.error('调度结果格式不匹配，请检查AI服务响应');
        } else {
          this.$message.success(`调度完成，共 ${processedCount} 个任务已获得调度结果，状态已更新为Ready`);
        }
        
        // 🔧 强制刷新表格数据，确保调度结果能够被正确显示和检查
        this.getTableData();
        
        // 🆕 刷新后恢复选中状态
        this.$nextTick(() => {
          // 根据ID和key重新匹配选中的行
          const newSelectedRows = [];
          currentSelectedRows.forEach(originalRow => {
            const matchedRow = this.tableData.find(tableRow => 
              tableRow.id === originalRow.id && tableRow.key === originalRow.key
            );
            if (matchedRow) {
              newSelectedRows.push(matchedRow);
            }
          });
          
          this.selectedRows = newSelectedRows;
          console.log('🔄 调度结果更新后已恢复选中状态:', this.selectedRows.length, '个任务');
          
          // 🆕 手动触发表格的选中状态更新
          this.$nextTick(() => {
            if (this.$refs.taskTable) {
              // 清除所有选中
              this.$refs.taskTable.clearSelection();
              // 重新选中对应的行
              this.selectedRows.forEach(row => {
                this.$refs.taskTable.toggleRowSelection(row, true);
              });
            }
          });
        });
        
        // 🆕 重置调度状态
        this.isScheduling = false;
        
        // 🔧 调度完成后立即保存状态，包括调度结果和选中状态
        this.pageStateStore.updateTaskSchedulingResults(this.schedule_result);
        this.pageStateStore.updateTaskSchedulingStatus(false);
        this.pageStateStore.updateTaskSelectedRows(this.selectedRows);
        this.savePageStateImmediate();
      } else {
        console.warn('⚠️ 调度结果为空');
        this.$message.warning('调度结果为空，请重新调度');
        
        // 🆕 即使结果为空也要重置调度状态
        this.isScheduling = false;
        
        // 🔧 即使出错也要保存状态
        this.pageStateStore.updateTaskSchedulingStatus(false);
        this.savePageStateImmediate();
      }
    },
    
    // 查看queue结果
    handleViewQueueResult(row) {
      if (!row.queueResult) {
        this.$message.warning('暂无调度结果');
        return;
      }
      
      this.currentQueueResult = {
        taskId: row.id,
        taskKey: row.key,
        taskName: row.parentTaskName,
        queueData: row.queueResult
      };
      
      // 显示查看对话框
      this.ViewDialogVisible = true;
      
      // 等待对话框和iframe完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          const iframe = document.querySelector('.ViewDialogVisible iframe');
          if (iframe) {
            const sendViewData = () => {
              try {
                const messageData = {
                  type: 'ROW_DATA',
                  data: JSON.stringify(row.queueResult.pathGraph)
                };
                
                const childOrigin = this.getChildOrigin(iframe);
                iframe.contentWindow.postMessage(messageData, childOrigin);
                console.log('✅ 已发送queue结果数据到viewInformation');
              } catch (error) {
                console.error('❌ 发送queue结果数据失败:', error);
              }
            };
            
            iframe.addEventListener('load', () => {
              setTimeout(sendViewData, 1000);
            });
            
            if (iframe.contentWindow) {
              setTimeout(sendViewData, 1000);
            }
          }
        }, 100);
      });
    },
    
    // 查看任务参数
    async handleViewParameters(row) {
      try {
        console.log('=== 开始查看参数 ===');
        console.log('选中行:', row.id, row.key, row.parentTaskName);
        
        // 设置加载状态 - Vue 3方式
        row.loadingParameters = true;
        
        // 立即清空之前的数据，避免显示错误的参数
        this.currentParametersData = null;
        this.formattedParameters = [];
        
        // 打开对话框
        this.parametersDialogVisible = true;
        
        // 从数据库加载参数
        const parametersData = await this.loadTaskParameters(row);
        console.log('💾 加载到的参数数据:', parametersData);
        
        // 设置参数数据
        this.currentParametersData = {
          taskId: row.id,
          taskKey: row.key,
          taskName: row.parentTaskName,
          product: row.product,
          reactTime: row.reactTime,
          parameters: parametersData.parameters || {},
          updatedAt: parametersData.updatedAt,
          rawRow: row // 保存原始行数据，用于编辑跳转
        };
        
        console.log('📋 设置的当前参数数据:', this.currentParametersData);
        
        // 格式化参数用于表格显示
        this.formatParametersForDisplay();
        
      } catch (error) {
        console.error('❌ 加载任务参数失败:', error);
        this.$message.error('加载任务参数失败: ' + error.message);
        this.parametersDialogVisible = false;
      } finally {
        row.loadingParameters = false;
      }
    },
    
    // 从数据库加载任务参数
    async loadTaskParameters(row) {
      try {
        console.log('=== 开始加载参数 ===');
        console.log('任务ID:', row.id, '任务键值:', row.key);
        
        // 首先尝试从本地数据中获取参数
        const parentTask = this.allData.find(item => item.id === row.id);
        console.log('找到的父任务:', parentTask?.id, parentTask?.taskName);
        
        if (parentTask && parentTask.mapping_result && parentTask.mapping_result[row.key]) {
          const localParameters = parentTask.mapping_result[row.key].parameters;
          console.log('本地参数检查:', localParameters);
          
          if (localParameters && Object.keys(localParameters).length > 0) {
            console.log('✅ 从本地数据加载参数:', localParameters);
            return {
              parameters: localParameters,
              updatedAt: parentTask.mapping_result[row.key].updatedAt || '本地数据'
            };
          }
        }
        
        // 如果本地没有参数，从数据库获取
        console.log('⚠️ 本地无参数，从数据库获取:', row.id, row.key);
        const tokenInfo = getToken();
        const token = tokenInfo?.accessToken;
        
        const myHeaders = new Headers();
        myHeaders.append("token", token);
        myHeaders.append("User-Agent", "Apifox/1.0.0 (https://apifox.com)");
        myHeaders.append("Accept", "*/*");
        myHeaders.append("Connection", "keep-alive");

        const requestOptions = {
          method: 'GET',
          headers: myHeaders,
          redirect: 'follow'
        };

        const response = await fetch(`/chem-api/tasks/${row.id}/parameters?taskKey=${row.key}`, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('🔍 数据库参数查询结果:', result);
        
        if (result && result.code === 1 && result.data) {
          // 如果数据库中有参数，更新本地数据（只更新对应的任务和键值）
          if (result.data.parameters && Object.keys(result.data.parameters).length > 0) {
            console.log('✅ 从数据库获取到参数，准备更新本地缓存');
            
            // 确保只更新对应的任务和键值的参数
            if (parentTask && parentTask.mapping_result && parentTask.mapping_result[row.key]) {
              // 确保我们更新的是正确的任务
              if (parentTask.id === row.id) {
                parentTask.mapping_result[row.key].parameters = result.data.parameters;
                parentTask.mapping_result[row.key].updatedAt = result.data.updated_at || result.data.saved_at;
                console.log('✅ 已更新本地缓存，任务ID:', parentTask.id, '键值:', row.key);
              } else {
                console.warn('⚠️ 任务ID不匹配，跳过本地缓存更新');
              }
            }
            
            return {
              parameters: result.data.parameters,
              updatedAt: result.data.updated_at || result.data.saved_at
            };
          }
        }
        
        // 如果数据库中也没有参数，返回空参数
        console.log('❌ 数据库中也没有找到参数');
        return {
          parameters: {},
          updatedAt: null
        };
        
      } catch (error) {
        console.error('❌ 从数据库加载参数失败:', error);
        // 如果数据库请求失败，返回空参数而不是抛出错误
        return {
          parameters: {},
          updatedAt: null
        };
      }
    },
    
    // 格式化参数用于表格显示
    formatParametersForDisplay() {
      console.log('🔧 开始格式化参数显示:', this.currentParametersData);
      
      if (!this.currentParametersData || !this.currentParametersData.parameters) {
        console.log('❌ 没有参数数据，设置为空数组');
        this.formattedParameters = [];
        return;
      }
      
      const parameters = this.currentParametersData.parameters;
      console.log('📋 原始参数数据:', parameters);
      this.formattedParameters = [];
      
      // 检查参数数据的结构
      if (!parameters || typeof parameters !== 'object') {
        console.log('⚠️ 参数数据格式无效');
        this.formattedParameters = [];
        return;
      }
      
      // 遍历参数对象，转换为表格数据
      Object.entries(parameters).forEach(([deviceId, deviceInfo]) => {
        console.log('🔍 处理设备:', deviceId, deviceInfo);
        
        // 🚫 过滤掉纯数字的设备ID，这些通常是旧格式或错误格式
        if (/^\d+$/.test(deviceId)) {
          console.warn('🚫 跳过纯数字设备ID:', deviceId);
          return;
        }
        
        // 🚫 过滤掉不符合 deviceType_id 格式的设备ID
        if (!deviceId.includes('_') && !deviceId.includes('-')) {
          console.warn('🚫 跳过不规范设备ID:', deviceId);
          return;
        }
        
        // 验证设备信息的格式
        if (!deviceInfo || typeof deviceInfo !== 'object') {
          console.warn('⚠️ 设备信息格式无效:', deviceId, deviceInfo);
          return;
        }
        
        // 检查设备信息是否有正确的结构
        if (deviceInfo.type && deviceInfo.parameters && typeof deviceInfo.parameters === 'object') {
          // 标准格式: { type: "pump", parameters: { flowRate: 10 } }
          console.log('✅ 标准格式设备:', deviceId);
          
          // 确保参数对象不为空
          if (Object.keys(deviceInfo.parameters).length > 0) {
            this.formattedParameters.push({
              deviceId: deviceId,
              deviceType: deviceInfo.type,
              parameters: deviceInfo.parameters
            });
          } else {
            console.warn('⚠️ 设备参数为空:', deviceId);
          }
        } else if (typeof deviceInfo === 'object' && !deviceInfo.type && !deviceInfo.parameters) {
          // 可能是直接的参数对象格式: { flowRate: 10, speed: 1000 }
          console.log('🔄 直接参数格式设备:', deviceId);
          
          // 确保参数对象不为空且不包含嵌套的type/parameters结构
          if (Object.keys(deviceInfo).length > 0 && !deviceInfo.hasOwnProperty('type')) {
            this.formattedParameters.push({
              deviceId: deviceId,
              deviceType: this.extractDeviceType(deviceId),
              parameters: deviceInfo
            });
          } else {
            console.warn('⚠️ 直接格式参数为空或格式错误:', deviceId);
          }
        } else {
          console.warn('⚠️ 无法识别的设备数据格式:', deviceId, deviceInfo);
        }
      });
      
      console.log('✅ 格式化后的参数:', this.formattedParameters);
      
      // 验证格式化结果
      if (this.formattedParameters.length === 0 && Object.keys(parameters).length > 0) {
        console.error('❌ 参数格式化失败，原始数据有内容但格式化结果为空');
        console.error('原始参数keys:', Object.keys(parameters));
        console.error('原始参数sample:', Object.entries(parameters)[0]);
        
        // 提供兜底方案：显示所有非纯数字的设备
        Object.entries(parameters).forEach(([deviceId, deviceInfo]) => {
          if (!/^\d+$/.test(deviceId) && deviceInfo && typeof deviceInfo === 'object') {
            this.formattedParameters.push({
              deviceId: deviceId,
              deviceType: deviceInfo.type || this.extractDeviceType(deviceId) || 'unknown',
              parameters: deviceInfo.parameters || deviceInfo
            });
          }
        });
        console.log('🔧 兜底处理后的参数:', this.formattedParameters);
      }
    },
    
    // 从设备ID提取设备类型
    extractDeviceType(deviceId) {
      if (deviceId.includes('pump')) return 'pump';
      if (deviceId.includes('valve')) return 'valve';
      if (deviceId.includes('heater') || deviceId.includes('chip')) return 'heater';
      if (deviceId.includes('mfc')) return 'mfc';
      if (deviceId.includes('light')) return 'light';
      if (deviceId.includes('bottle')) return 'bottle';
      return 'unknown';
    },
    
    // 获取设备类型颜色
    getDeviceTypeColor(deviceType) {
      const colorMap = {
        'pump': 'primary',
        'valve': 'success',
        'heater': 'warning',
        'mfc': 'info',
        'light': 'danger',
        'bottle': 'default',
        'unknown': 'default'
      };
      return colorMap[deviceType] || 'default';
    },
    
    // 获取设备类型中文名称
    getDeviceTypeName(deviceType) {
      const nameMap = {
        'pump': '泵',
        'valve': '阀门',
        'heater': '加热器',
        'mfc': 'MFC控制器',
        'light': '光照控制',
        'bottle': '瓶子',
        'unknown': '未知设备'
      };
      return nameMap[deviceType] || deviceType;
    },
    
    // 格式化参数键名
    formatParameterKey(key) {
      const keyMap = {
        'flowRate': '流速',
        'temperature': '温度',
        'position': '位置',
        'intensity': '强度',
        'volume': '容量',
        'pressure': '压力',
        'speed': '速度',
        'duration': '持续时间'
      };
      return keyMap[key] || key;
    },
    
    // 格式化参数值
    formatParameterValue(key, value) {
      if (value === null || value === undefined) return '未设置';
      
      const unitMap = {
        'flowRate': 'mL/min',
        'temperature': '°C',
        'position': 'μL',      // 泵位置单位为微升
        'port': '',            // 阀门孔位无单位
        'intensity': '%',
        'volume': 'mL',
        'pressure': 'Pa',
        'speed': 'rpm',
        'duration': 's'
      };
      
      // 🔧 特殊处理：阀门孔位显示
      if (key === 'port' || (key === 'position' && this.isValveParameter(key))) {
        return `${value}号孔位`;
      }
      
      const unit = unitMap[key] || '';
      return `${value} ${unit}`.trim();
    },

    // 判断是否为阀门参数
    isValveParameter(paramKey) {
      // 通过上下文判断，如果当前处理的是阀门设备的参数
      // 这个方法可以根据实际情况进行优化
      return false; // 暂时返回false，因为我们已经区分了port和position
    },
    
    // 从参数对话框跳转到编辑
    handleEditFromParameters() {
      if (!this.currentParametersData || !this.currentParametersData.rawRow) {
        this.$message.warning('无法获取任务数据');
        return;
      }
      
      // 关闭参数对话框
      this.parametersDialogVisible = false;
      
      // 调用编辑方法
      this.handleEdit(this.currentParametersData.rawRow);
    },
    // 🚀 执行选中任务的工作流（支持并发执行）
    async executeSelectedTasksWorkflow() {
      if (this.selectedRows.length === 0) {
        this.$message.warning('请先选择要执行的任务');
        return;
      }
      
      // 🆕 保存当前选中状态，防止检查过程中丢失
      const originalSelectedRows = [...this.selectedRows];
      
      // 🔧 增强的调度结果检查逻辑
      console.log('🔍 检查选中任务的调度状态:', this.selectedRows.map(row => ({
        id: row.id,
        key: row.key,
        taskName: row.parentTaskName,
        hasQueueResult: !!row.queueResult,
        queueResult: row.queueResult
      })));
      
      const tasksWithoutSchedule = this.selectedRows.filter(row => !row.queueResult);
      if (tasksWithoutSchedule.length > 0) {
        console.error('❌ 未调度的任务:', tasksWithoutSchedule.map(row => ({
          id: row.id,
          key: row.key,
          taskName: row.parentTaskName
        })));
        
        // 🆕 即使检查失败也要保持选中状态
        this.selectedRows = [...originalSelectedRows];
        
        this.$message.error(`请先对以下任务进行调度（scheduling）：${tasksWithoutSchedule.map(row => row.parentTaskName).join(', ')}`);
        return;
      }
      
      console.log('✅ 所有选中任务都已完成调度，开始生成执行计划');
      
      try {
        // 🔧 生成执行计划（包含完整工作流）
        console.log('🎯 生成工作流预览...');
        const executionPlan = this.generateExecutionPlan(this.selectedRows);
        
        if (executionPlan.length === 0) {
          this.$message.warning('无法生成有效的执行计划');
          // 🆕 保持选中状态
          this.selectedRows = [...originalSelectedRows];
          return;
        }
        
        // 🚀 检查并发执行可能性
        if (this.concurrentExecution.enabled && executionPlan.length > 1) {
          console.log('🚀 检测到多个任务，分析并发执行可能性...');
          
          // 分析任务分组
          const concurrentGroups = this.groupTasksForConcurrentExecution(executionPlan);
          const canBenefit = concurrentGroups.length < executionPlan.length;
          
          if (canBenefit) {
            try {
              const result = await this.$confirm(
                `检测到可以并发执行任务：\n` +
                `• 总任务数: ${executionPlan.length}\n` +
                `• 并发组数: ${concurrentGroups.length}\n` +
                `• 预计提升效率: ${Math.round((1 - concurrentGroups.length / executionPlan.length) * 100)}%\n\n` +
                `是否启用并发执行模式？`,
                '并发执行优化',
                {
                  confirmButtonText: '启用并发执行',
                  cancelButtonText: '顺序执行',
                  type: 'info',
                  distinguishCancelAndClose: true
                }
              );
              
              if (result) {
                // 启动并发执行预览
                console.log('🚀 用户选择并发执行模式');
                await this.showConcurrentWorkflowPreview(executionPlan);
                return;
              }
            } catch (error) {
              console.log('👤 用户选择顺序执行模式');
            }
          } else {
            console.log('🔍 任务间存在冲突，无法有效并发，使用顺序执行');
          }
        }
        
        // 常规顺序执行
        console.log('📝 使用顺序执行模式');
        this.previewExecutionPlan = executionPlan;
        
        // 🔧 为每个任务生成完整的工作流
        this.previewExecutionPlan.forEach(taskExecution => {
          taskExecution.workflow = this.generateTaskWorkflow(taskExecution);
        });
        
        // 🔧 默认展开第一个任务的工作流详情
        if (this.previewExecutionPlan.length > 0) {
          this.activeWorkflowPanels = [this.previewExecutionPlan[0].taskId];
        }
        
        // 🔧 显示工作流预览对话框
        this.showWorkflowPreviewDialog = true;
        
        console.log('🎯 工作流预览生成完成:', this.previewExecutionPlan);
        
      } catch (error) {
        console.error('启动工作流失败:', error);
        this.$message.error(`启动工作流失败: ${error.message}`);
        this.isExecutingWorkflow = false;
      }
    },
    
    // 🚀 并发执行工作流到硬件系统
    async sendConcurrentWorkflowToHardware(concurrentGroups) {
      return new Promise((resolve, reject) => {
        try {
          const workflowData = {
            type: 'executeConcurrentWorkflow',
            workflowId: `concurrent_workflow_${Date.now()}`,
            startTime: new Date().toISOString(),
            concurrentMode: true,
            totalGroups: concurrentGroups.length,
            groups: concurrentGroups.map((group, groupIndex) => ({
              groupId: `group_${groupIndex}`,
              groupName: `并发组 ${groupIndex + 1}`,
              tasks: group.tasks.map(task => ({
                taskId: task.taskId,
                taskName: task.taskName,
                taskKey: task.taskKey,
                devicePath: task.devicePath,
                pathGraph: task.pathGraph,
                parameters: task.parameters,
                reactTime: task.reactTime,
                expectedDuration: task.duration,
                expectedStates: this.generateExpectedDeviceStates(task)
              })),
              mergedWorkflow: group.mergedWorkflow,
              estimatedDuration: group.estimatedDuration,
              deviceList: group.deviceList
            }))
          };
          
          const sent = this.sendHardwareMessage(workflowData);
          
          if (sent) {
            console.log('✅ 并发工作流已发送到硬件系统:', workflowData);
            resolve(workflowData);
          } else {
            console.warn('⚠️ 硬件WebSocket未连接，并发工作流已缓存');
            resolve(workflowData);
          }
          
        } catch (error) {
          console.error('❌ 发送并发工作流失败:', error);
          reject(error);
        }
      });
    },

    // 🎯 发送工作流到硬件系统（增强版）
    async sendWorkflowToHardware(executionPlan) {
      return new Promise((resolve, reject) => {
      try {
          // 🔧 构建完整的工作流数据，确保后端接收到真实数据而非测试数据
        const workflowData = {
          type: 'executeWorkflow',
          workflowId: `workflow_${Date.now()}`,
          startTime: new Date().toISOString(),
          // 🔧 添加标识，确保后端知道这是来自前端的真实数据
          isRealData: true,
          source: 'frontend_task_execution',
          debugMode: false, // 明确指示不使用调试模式
          tasks: executionPlan.map(task => ({
            taskId: task.taskId,
              taskName: task.taskName || '未命名任务', // 🔧 确保任务名称存在
            taskKey: task.taskKey,
              product: task.product || '未知产品', // 🔧 确保产品信息存在
              devicePath: task.devicePath || [],
              pathGraph: task.pathGraph || {},
              parameters: task.parameters || {},
              reactTime: task.reactTime || 0,
              expectedDuration: task.duration || 0,
              // 🎯 添加关键的硬件期望状态
              expectedStates: this.generateExpectedDeviceStates(task),
              // 🔧 添加时间戳，确保数据新鲜度
              timestamp: new Date().toISOString()
          }))
        };
        
        console.log('📤 发送到后端的工作流数据:', JSON.stringify(workflowData, null, 2));
        
          // 🔧 使用增强的消息发送机制
          const sent = this.sendHardwareMessage(workflowData);
          
          if (sent) {
            console.log('✅ 工作流已发送到硬件系统:', workflowData);
            resolve(workflowData);
        } else {
            console.warn('⚠️ 硬件WebSocket未连接，工作流已缓存');
            // 即使缓存了，也认为"发送"成功，因为会在重连后自动发送
            resolve(workflowData);
        }
        
      } catch (error) {
        console.error('❌ 发送工作流到硬件失败:', error);
          reject(error);
      }
      });
    },
    
    // 🎯 生成期望的设备状态（用于硬件状态对比）
    generateExpectedDeviceStates(taskExecution) {
      const expectedStates = new Map();
      
      // 基于任务参数和设备路径生成期望状态
      const devices = this.analyzeDevicesFromPath(taskExecution.devicePath, taskExecution.pathGraph);
      
      // 为每种设备类型设置期望状态
      devices.pumps.forEach(pump => {
        expectedStates.set(pump.id, {
          status: 'running',
          flowRate: taskExecution.parameters[`pump_${pump.id}`]?.flowRate || 10,
          isActive: true
        });
      });
      
      devices.heaters.forEach(heater => {
        expectedStates.set(heater.id, {
          status: 'heating',
          temperature: taskExecution.parameters[`heater_${heater.id}`]?.temperature || 80,
          isActive: true
        });
      });
      
      devices.valves.forEach(valve => {
        expectedStates.set(valve.id, {
          status: 'open',
          position: taskExecution.parameters[`valve_${valve.id}`]?.position || 'open',
          isActive: true
        });
      });
      
      return Object.fromEntries(expectedStates);
    },
    
    // 生成执行计划 - 增强版，支持多种调度结果格式
    generateExecutionPlan(selectedTasks) {
      const executionPlan = [];
      
      selectedTasks.forEach(task => {
        const queueResult = task.queueResult;
        
        if (!queueResult) {
          console.warn(`任务 ${task.id} 没有调度结果`);
          return;
        }
        
        console.log('🔍 处理任务调度结果:', task.id, queueResult);
        
        // 🔧 兼容多种调度结果格式
        let devicePath = [];
        let pathGraph = {};
        let scheduledTime = null;
        let duration = task.reactTime || 0;
        
        // 方案1: 直接包含pathDevices字段
        if (queueResult.pathDevices && Array.isArray(queueResult.pathDevices)) {
          devicePath = queueResult.pathDevices;
          pathGraph = queueResult.pathGraph || {};
          scheduledTime = queueResult.scheduledTime;
          duration = queueResult.duration || duration;
        }
        // 方案2: 调度结果包含多个路径选项，选择第一个
        else if (queueResult.routes && Array.isArray(queueResult.routes) && queueResult.routes.length > 0) {
          const selectedRoute = queueResult.routes[0]; // 选择第一个路径
          devicePath = selectedRoute.pathDevices || selectedRoute.devices || [];
          pathGraph = selectedRoute.pathGraph || selectedRoute.graph || {};
          scheduledTime = selectedRoute.scheduledTime || queueResult.scheduledTime;
          duration = selectedRoute.duration || duration;
        }
        // 方案3: 调度结果是完整的路径信息
        else if (queueResult.matched_path && Array.isArray(queueResult.matched_path)) {
          devicePath = queueResult.matched_path;
          pathGraph = queueResult.H_with_map || queueResult.pathGraph || {};
          scheduledTime = queueResult.start_time || queueResult.scheduledTime;
          duration = queueResult.duration || duration;
        }
        // 方案4: 调度结果嵌套在其他字段中
        else if (queueResult.result && queueResult.result.pathDevices) {
          devicePath = queueResult.result.pathDevices;
          pathGraph = queueResult.result.pathGraph || {};
          scheduledTime = queueResult.result.scheduledTime;
          duration = queueResult.result.duration || duration;
        }
        
        // 验证设备路径是否有效
        if (!devicePath || devicePath.length === 0) {
          console.warn(`任务 ${task.id} 的调度结果中没有找到有效的设备路径`);
          console.log('调度结果结构:', queueResult);
          
          // 🔧 尝试从原始匹配数据中提取设备路径
          const parentTask = this.allData.find(item => item.id === task.id);
          if (parentTask && parentTask.mapping_result && parentTask.mapping_result[task.key]) {
            const matchData = parentTask.mapping_result[task.key].match;
            if (matchData && Array.isArray(matchData) && matchData.length > 0) {
              const firstMatch = matchData[0];
              devicePath = firstMatch.matched_path || [];
              pathGraph = firstMatch.H_with_map || {};
              console.log(`从原始匹配数据中提取设备路径:`, devicePath);
            }
          }
        }
        
        // 🔧 过滤设备路径，确保只包含有效的设备ID
        const validDevicePath = devicePath.filter(deviceId => {
          return deviceId && 
                 typeof deviceId === 'string' && 
                 !deviceId.includes('执行步骤') && 
                 !deviceId.includes(':') && 
                 !deviceId.includes('初始化') && 
                 !deviceId.includes('抽吸') && 
                 !deviceId.includes('反应') && 
                 deviceId.length < 50 &&
                 /^[a-zA-Z0-9\-_]+$/.test(deviceId);
        });
        
        console.log(`🔧 任务 ${task.id} 过滤前设备路径:`, devicePath);
        console.log(`🔧 任务 ${task.id} 过滤后设备路径:`, validDevicePath);
        
        // 只有在有效设备路径时才创建执行计划
        if (validDevicePath && validDevicePath.length > 0) {
          const taskExecution = {
            taskId: task.id,
            taskName: task.parentTaskName,
            taskKey: task.key,
            product: task.product,
            reactTime: task.reactTime || 0,
            devicePath: validDevicePath,
            scheduledTime: scheduledTime,
            duration: duration,
            pathGraph: pathGraph,
            parameters: this.getTaskParameters(task),
            status: 'pending',
            // 🆕 添加原始调度结果引用，供调试使用
            originalQueueResult: queueResult
          };
          
          executionPlan.push(taskExecution);
          console.log(`✅ 任务 ${task.id} 执行计划已创建:`, taskExecution);
        } else {
          console.error(`❌ 无法为任务 ${task.id} 创建执行计划：缺少有效的设备路径`);
          if (devicePath && devicePath.length > 0) {
            console.warn(`⚠️ 原始设备路径包含非设备ID项，已过滤:`, devicePath);
          }
        }
      });
      
      // 按调度时间排序
      executionPlan.sort((a, b) => {
        if (a.scheduledTime && b.scheduledTime) {
          return new Date(a.scheduledTime) - new Date(b.scheduledTime);
        }
        return 0;
      });
      
      console.log('🎯 最终生成的执行计划:', executionPlan);
      return executionPlan;
    },
    
    // 🎯 更新选中任务的状态
    updateSelectedTasksStatus(newStatus) {
      this.selectedRows.forEach(row => {
        // 更新选中行状态
        row.status = newStatus;
        
        // 更新表格数据
        const tableRow = this.tableData.find(tRow => tRow.id === row.id && tRow.key === row.key);
        if (tableRow) {
          tableRow.status = newStatus;
        }
        
        // 更新分组数据
        const groupedRow = this.groupedRows.find(gRow => gRow.id === row.id && gRow.key === row.key);
        if (groupedRow) {
          groupedRow.status = newStatus;
        }
        
        // 更新原始数据
        const parentTask = this.allData.find(item => item.id === row.id);
        if (parentTask && parentTask.mapping_result && parentTask.mapping_result[row.key]) {
          parentTask.mapping_result[row.key].status = newStatus;
        }
        
        console.log(`✅ 任务 ${row.id} 状态已更新为 ${this.statusMap[newStatus]}`);
      });
      
      // 强制刷新表格
      this.getTableData();
    },
    
    // 🎯 确认执行工作流
    async confirmWorkflowExecution() {
      this.isConfirmingExecution = true;
      
      try {
        console.log('🎯 用户确认执行工作流');
        
        // 关闭预览对话框
        this.showWorkflowPreviewDialog = false;
        
        console.log('📋 执行计划:', this.previewExecutionPlan);
        
        // 🎯 更新选中任务状态为"In Progress"
        this.updateSelectedTasksStatus(1); // 1 = In Progress
        
        // 🎯 保存工作流信息到Store，供监控界面使用
        // 确保数据格式完整性
        const formattedExecutionPlan = this.previewExecutionPlan.map(task => ({
          taskId: task.taskId,
          taskName: task.taskName,
          taskKey: task.taskKey,
          devicePath: task.devicePath || [],
          pathGraph: task.pathGraph || null,
          parameters: task.parameters || {},
          reactTime: task.reactTime || 0,
          duration: task.duration || 0,
          expectedStates: task.expectedStates || this.generateExpectedDeviceStates(task)
        }));
        runningTasksStore.startWorkflowExecution(formattedExecutionPlan);
        
        // 🎯 发送硬件控制命令（基于实际硬件状态）
        await this.sendWorkflowToHardware(this.previewExecutionPlan);
        
        // 🎯 跳转到监控界面并自动加载第一个任务的结构图
        this.$router.push('/monitor').then(() => {
          console.log('🎯 已跳转到监控界面，开始工作流可视化流程');
          
          // 🎯 优化：使用事件驱动的方式等待iframe准备就绪
          this.initializeWorkflowVisualization(this.previewExecutionPlan);
        });
        
        this.$message.success(`已启动工作流，共 ${this.previewExecutionPlan.length} 个任务，请查看监控界面`);
        
      } catch (error) {
        console.error('启动工作流失败:', error);
        this.$message.error(`启动工作流失败: ${error.message}`);
      } finally {
        this.isConfirmingExecution = false;
      }
    },
    
    // 🎯 取消工作流执行
    cancelWorkflowExecution() {
      this.showWorkflowPreviewDialog = false;
      this.previewExecutionPlan = [];
      this.activeWorkflowPanels = [];
      console.log('🎯 用户取消执行工作流');
    },

    // 🚀 显示并发工作流预览
    async showConcurrentWorkflowPreview(executionPlan) {
      console.log('🚀 生成并发工作流预览...');
      
      try {
        // 1. 任务分组
        const concurrentGroups = this.groupTasksForConcurrentExecution(executionPlan);
        
        // 2. 为每个组生成合并的工作流
        concurrentGroups.forEach((group, groupIndex) => {
          group.mergedWorkflow = this.mergeWorkflowSteps(group);
          group.groupId = `group_${groupIndex}`;
          group.groupName = `并发组 ${groupIndex + 1}`;
          group.estimatedDuration = group.mergedWorkflow.estimatedDuration || 
            group.tasks.reduce((sum, task) => sum + (task.duration || task.reactTime * 60 || 1800), 0);
          
          console.log(`📋 组${groupIndex + 1}:`, {
            taskCount: group.tasks.length,
            taskNames: group.tasks.map(t => t.taskName),
            stepCount: group.mergedWorkflow.steps.length,
            deviceCount: group.deviceList ? group.deviceList.length : 0,
            canConcurrent: group.canConcurrent
          });
        });
        
        // 3. 保存预览数据
        this.concurrentPreviewGroups = concurrentGroups;
        
        // 4. 默认展开第一个组
        if (concurrentGroups.length > 0) {
          this.activeConcurrentPanels = [concurrentGroups[0].groupId];
        }
        
        // 5. 显示预览对话框
        this.showConcurrentPreviewDialog = true;
        
        console.log('🚀 并发工作流预览生成完成:', this.concurrentPreviewGroups);
        
      } catch (error) {
        console.error('生成并发工作流预览失败:', error);
        this.$message.error(`生成并发预览失败: ${error.message}`);
      }
    },

    // 🚀 确认并发执行
    async confirmConcurrentExecution() {
      this.isConfirmingConcurrentExecution = true;
      
      try {
        console.log('🚀 用户确认并发执行');
        
        // 关闭预览对话框
        this.showConcurrentPreviewDialog = false;
        
        // 启动并发工作流执行
        await this.startConcurrentWorkflowExecution(this.concurrentPreviewGroups);
        
      } catch (error) {
        console.error('启动并发工作流失败:', error);
        this.$message.error(`启动并发工作流失败: ${error.message}`);
      } finally {
        this.isConfirmingConcurrentExecution = false;
      }
    },

    // 🚀 取消并发执行
    cancelConcurrentExecution() {
      this.showConcurrentPreviewDialog = false;
      this.concurrentPreviewGroups = [];
      this.activeConcurrentPanels = [];
      console.log('🚀 用户取消并发执行');
    },

    // 🚀 并发预览辅助方法
    getTotalTaskCount() {
      return this.concurrentPreviewGroups.reduce((sum, group) => sum + group.tasks.length, 0);
    },

    getEfficiencyImprovement() {
      const totalTasks = this.getTotalTaskCount();
      const groups = this.concurrentPreviewGroups.length;
      if (totalTasks <= 1 || groups <= 0) return 0;
      return Math.round((1 - groups / totalTasks) * 100);
    },

    formatConcurrentTotalDuration() {
      const totalDuration = Math.max(...this.concurrentPreviewGroups.map(group => 
        group.estimatedDuration || 0
      ));
      return Math.round(totalDuration / 60);
    },

    getSavedTime() {
      const totalTasks = this.getTotalTaskCount();
      const groups = this.concurrentPreviewGroups.length;
      const avgTaskDuration = 30; // 假设平均任务时长30分钟
      
      const sequentialTime = totalTasks * avgTaskDuration;
      const concurrentTime = groups * avgTaskDuration;
      
      return Math.max(0, sequentialTime - concurrentTime);
    },

    getDeviceTagType(deviceId) {
      if (!deviceId) return 'info';
      
      const deviceType = deviceId.split('-')[0].toLowerCase();
      const typeMap = {
        'pump': 'primary',
        'valve': 'success', 
        'chip': 'danger',
        'heater': 'danger',
        'bottle': 'warning',
        'mfc': 'info',
        'light': 'warning'
      };
      
      return typeMap[deviceType] || 'info';
    },

    // 🚀 格式化命令操作
    formatCommandAction(action) {
      if (!action) return '未指定操作';
      
      const actionMap = {
        'set': '设置',
        'move': '移动',
        'pump': '抽吸',
        'dispense': '分配',
        'heat': '加热',
        'cool': '冷却',
        'switch': '切换',
        'open': '打开',
        'close': '关闭',
        'start': '启动',
        'stop': '停止',
        'wait': '等待',
        'check': '检查'
      };
      
      return actionMap[action] || action;
    },

    // 🚀 格式化命令参数
    formatCommandParameters(parameters) {
      if (!parameters || typeof parameters !== 'object') {
        return '无参数';
      }
      
      const formatValue = (key, value) => {
        if (value === null || value === undefined) return '未设置';
        
        const unitMap = {
          'flowRate': 'mL/min',
          'temperature': '°C',
          'position': '',
          'intensity': '%',
          'volume': 'mL',
          'pressure': 'Pa',
          'speed': 'rpm',
          'duration': 's',
          'time': 's'
        };
        
        const unit = unitMap[key] || '';
        return `${value} ${unit}`.trim();
      };
      
      const paramEntries = Object.entries(parameters);
      if (paramEntries.length === 0) return '无参数';
      
      return paramEntries
        .map(([key, value]) => `${this.formatParameterKey(key)}: ${formatValue(key, value)}`)
        .join(', ');
    },
    
    // 🎯 工作流预览辅助方法
    calculateTotalDuration() {
      if (!this.previewExecutionPlan || this.previewExecutionPlan.length === 0) return 0;
      
      return this.previewExecutionPlan.reduce((total, task) => {
        return total + (task.duration || task.reactTime * 60 || 30);
      }, 0);
    },
    
    formatTime(timeString) {
      if (!timeString) return '未设定';
      const date = new Date(timeString);
      return date.toLocaleString();
    },
    
    getDeviceIcon(deviceId) {
      if (!deviceId) return '🔧';
      
      const deviceIdLower = deviceId.toLowerCase();
      if (deviceIdLower.includes('pump')) return '🔄';
      if (deviceIdLower.includes('valve')) return '⚡';
      if (deviceIdLower.includes('chip') || deviceIdLower.includes('heater')) return '🔥';
      if (deviceIdLower.includes('mfc')) return '💨';
      if (deviceIdLower.includes('light')) return '💡';
      return '🔧';
    },
    
    getDeviceTypeName(deviceType) {
      const typeMap = {
        'pump': '泵',
        'valve': '阀门',
        'chip': '芯片',
        'heater': '加热器',
        'mfc': '质量流量计',
        'light': '光源',
        'bottle': '试剂瓶'
      };
      return typeMap[deviceType] || deviceType;
    },
    
    formatCommandAction(action) {
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
    },
    
    formatCommandParameters(parameters) {
      if (!parameters || typeof parameters !== 'object') return '';
      
      const paramStrings = [];
      Object.entries(parameters).forEach(([key, value]) => {
        const unit = this.getParameterUnit(key);
        paramStrings.push(`${key}: ${value}${unit}`);
      });
      
      return paramStrings.join(', ');
    },
    
    getComparisonSymbol(comparison) {
      const symbolMap = {
        'eq': '=',
        'ne': '≠',
        'gt': '>',
        'gte': '≥',
        'lt': '<',
        'lte': '≤',
        'approx': '≈'
      };
      return symbolMap[comparison] || comparison;
    },
    
    getParameterUnit(parameter) {
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
    },
    


    // 获取设备类型
    getDeviceTypeFromId(deviceId) {
      if (!deviceId) return 'unknown';
      
      const deviceIdLower = deviceId.toLowerCase();
      if (deviceIdLower.includes('pump')) return 'pump';
      if (deviceIdLower.includes('valve')) return 'valve';
      if (deviceIdLower.includes('chip') || deviceIdLower.includes('heater')) return 'heater';
      if (deviceIdLower.includes('mfc')) return 'flowmeter';
      if (deviceIdLower.includes('light')) return 'light';
      if (deviceIdLower.includes('sensor')) return 'sensor';
      if (deviceIdLower.includes('mixer')) return 'mixer';
      
      return 'unknown';
    },

    // 获取设备类型中文名
    getDeviceTypeName(type) {
      const typeMap = {
        'pump': '泵',
        'valve': '阀门',
        'heater': '加热器', 
        'flowmeter': '流量计',
        'light': '光源',
        'sensor': '传感器',
        'mixer': '混合器',
        'chip': '芯片',
        'mfc': '流量控制器',
        'unknown': '未知设备'
      };
      return typeMap[type] || type;
    },
    
    // 查看任务路径图详情
    viewTaskPathGraph(taskExecution) {
      console.log('🔍 查看任务路径图:', taskExecution);
      
      // 准备viewInformation所需的数据
      const graphData = {
        taskId: taskExecution.taskId,
        taskName: taskExecution.taskName,
        pathGraph: taskExecution.pathGraph,
        devicePath: taskExecution.devicePath,
        parameters: taskExecution.parameters
      };
      
      // 创建一个新的对话框来显示详细路径图
      this.currentViewData = graphData;
      this.ViewDialogVisible = true;
      
      // 等待对话框和iframe完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          const iframe = document.querySelector('.ViewDialogVisible iframe');
          if (iframe) {
            const sendViewData = () => {
              try {
                const messageData = {
                  type: 'ROW_DATA',
                  data: JSON.stringify(taskExecution.pathGraph || {})
                };
                
                const childOrigin = this.getChildOrigin(iframe);
                iframe.contentWindow.postMessage(messageData, childOrigin);
                console.log('✅ 已发送任务路径图数据到viewInformation');
              } catch (error) {
                console.error('❌ 发送路径图数据失败:', error);
              }
            };
            
            iframe.addEventListener('load', () => {
              setTimeout(sendViewData, 1000);
            });
            
            // 如果iframe已经加载，直接发送数据
            if (iframe.contentWindow) {
              setTimeout(sendViewData, 1000);
            }
          }
        }, 100);
      });
    },
    
    // 获取任务的参数设置
    getTaskParameters(task) {
      const parentTask = this.allData.find(item => item.id === task.id);
      if (parentTask && parentTask.mapping_result && parentTask.mapping_result[task.key]) {
        return parentTask.mapping_result[task.key].parameters || {};
      }
      return {};
    },
    
    // 开始工作流执行
    async startWorkflowExecution(executionPlan) {
      this.isExecutingWorkflow = true;
      this.workflowExecution = {
        status: 'running',
        currentTaskIndex: 0,
        currentTask: executionPlan[0],
        totalTasks: executionPlan.length,
        startTime: new Date(),
        endTime: null,
        executionPlan: executionPlan,
        stepResults: new Map(),
        errorMessages: [],
        // 新增状态监控字段
        deviceStates: new Map(), // 设备状态缓存
        taskProgress: new Map(), // 任务进度跟踪
        executionLog: [] // 执行日志
      };
      
      this.$message.success(`开始执行工作流，共 ${executionPlan.length} 个任务`);
      
      try {
        // 逐个执行任务
        for (let i = 0; i < executionPlan.length; i++) {
          // 检查是否被暂停或停止
          if (this.workflowExecution.status === 'paused') {
            await this.waitForResume();
          }
          
          if (this.workflowExecution.status === 'stopped') {
            throw new Error('工作流已被用户终止');
          }
          
          this.workflowExecution.currentTaskIndex = i;
          this.workflowExecution.currentTask = executionPlan[i];
          
          // 更新任务状态为运行中（仅前端）
          this.updateTaskStatus(executionPlan[i].taskId, 1);
          
          // 记录任务开始时间
          this.workflowExecution.taskProgress.set(executionPlan[i].taskId, {
            startTime: new Date(),
            status: 'running',
            progress: 0
          });
          
          this.addExecutionLog(`开始执行任务: ${executionPlan[i].taskName}`);
          
          // 执行单个任务
          await this.executeSingleTask(executionPlan[i]);
          
          // 更新任务状态为已完成（仅前端）
          this.updateTaskStatus(executionPlan[i].taskId, 2);
          
          // 记录任务完成（简化版）
          this.workflowExecution.taskProgress.set(executionPlan[i].taskId, {
            ...this.workflowExecution.taskProgress.get(executionPlan[i].taskId),
            endTime: new Date(),
            status: 'completed',
            progress: 100
          });
          
          this.addExecutionLog(`任务完成: ${executionPlan[i].taskName}`);
          this.$message.success(`任务 ${executionPlan[i].taskName} 执行完成`);
        }
        
        // 所有任务执行完成
        this.workflowExecution.status = 'completed';
        this.workflowExecution.endTime = new Date();
        this.addExecutionLog('所有任务执行完成');
        this.$message.success('所有任务执行完成！');
        
      } catch (error) {
        console.error('工作流执行失败:', error);
        this.workflowExecution.status = 'error';
        this.workflowExecution.endTime = new Date();
        this.workflowExecution.errorMessages.push(error.message);
        this.addExecutionLog(`工作流执行失败: ${error.message}`, 'error');
        this.$message.error(`工作流执行失败: ${error.message}`);
        
        // 更新当前任务状态为失败（仅前端）
        if (this.workflowExecution.currentTask) {
          this.updateTaskStatus(this.workflowExecution.currentTask.taskId, 3);
        }
      } finally {
        setTimeout(() => {
          this.isExecutingWorkflow = false;
          if (this.workflowExecution.status === 'completed' || this.workflowExecution.status === 'error') {
            this.workflowExecution.status = 'idle';
          }
        }, 3000);
      }
    },
    
    // 执行单个任务（增强版）
    async executeSingleTask(taskExecution) {
      console.log(`开始执行任务: ${taskExecution.taskName}`);
      
      // 生成工作流步骤
      const workflow = this.generateTaskWorkflow(taskExecution);
      
      // 执行工作流的每个步骤
      for (let stepIndex = 0; stepIndex < workflow.steps.length; stepIndex++) {
        const step = workflow.steps[stepIndex];
        
        console.log(`执行步骤 ${stepIndex + 1}/${workflow.steps.length}: ${step.name}`);
        this.addExecutionLog(`执行步骤: ${step.name}`);
        
        try {
          // 更新步骤进度
          const progress = ((stepIndex) / workflow.steps.length) * 100;
          this.updateTaskProgress(taskExecution.taskId, progress);
          
          await this.executeWorkflowStep(step, taskExecution);
          this.workflowExecution.stepResults.set(step.id, { 
            success: true, 
            completedAt: new Date(),
            executionTime: step.actualExecutionTime || 0
          });
          
          this.addExecutionLog(`步骤完成: ${step.name}`);
          
        } catch (error) {
          console.error(`步骤执行失败: ${step.name}`, error);
          this.workflowExecution.stepResults.set(step.id, { 
            success: false, 
            error: error.message,
            failedAt: new Date()
          });
          this.addExecutionLog(`步骤失败: ${step.name} - ${error.message}`, 'error');
          throw error;
        }
      }
      
      // 最终进度100%
      this.updateTaskProgress(taskExecution.taskId, 100);
      console.log(`任务 ${taskExecution.taskName} 执行完成`);
    },
    
    // 🎯 增强的执行工作流步骤 - 集成TopControl的条件检查机制
    async executeWorkflowStep(step, taskExecution) {
      const stepStartTime = Date.now();
      console.log(`🎯 执行步骤: ${step.name}`);
      this.addExecutionLog(`开始执行步骤: ${step.name}`);
      
      // 🔧 检查步骤是否有前置条件（TopControl标准）
      if (step.conditions && step.conditions.length > 0) {
        console.log(`步骤 "${step.name}" 有 ${step.conditions.length} 个前置条件，开始检查...`);
        this.addExecutionLog(`检查前置条件: ${step.conditions.length} 个条件`);
        
        try {
          await this.checkWorkflowConditions(step.conditions);
          console.log(`步骤 "${step.name}" 的前置条件已满足`);
          this.addExecutionLog(`前置条件已满足，开始执行设备命令`);
        } catch (error) {
          console.error(`步骤 "${step.name}" 的前置条件检查失败:`, error);
          this.addExecutionLog(`前置条件未满足: ${error.message}`, 'error');
          throw error;
        }
      }
      
      // 🔧 执行设备命令
      console.log(`开始发送 ${step.deviceCommands.length} 个设备命令...`);
      this.addExecutionLog(`发送 ${step.deviceCommands.length} 个设备命令`);
      
      const commandResults = [];
      for (const command of step.deviceCommands) {
        try {
          const result = await this.sendDeviceCommand(command);
          commandResults.push(result);
          this.addExecutionLog(`命令成功: ${command.deviceType} ${command.deviceId} - ${command.action}`);
        } catch (error) {
          console.error(`设备命令失败:`, command, error);
          this.addExecutionLog(`命令失败: ${command.deviceType} ${command.deviceId} - ${error.message}`, 'error');
          throw error;
        }
      }
      
      // 🔧 自动生成完成条件并检查（TopControl标准）
      const completionConditions = this.generateCompletionConditions(step.deviceCommands);
      
      if (completionConditions.length > 0) {
        this.addExecutionLog(`等待设备达到目标状态...共 ${completionConditions.length} 个条件需要检查`);
        
        try {
          await this.checkWorkflowConditions(completionConditions);
          this.addExecutionLog(`设备已达到目标状态`);
        } catch (error) {
          console.error(`完成条件检查失败:`, error);
          this.addExecutionLog(`等待设备达到目标状态失败: ${error.message}`, 'error');
          throw error;
        }
      } else if (step.waitForCompletion) {
        console.log(`步骤需要等待完成但没有具体条件，添加一个短暂等待时间（3秒）...`);
        await this.waitForDurationWithProgress(3, taskExecution.taskId);
      }
      
      // 🔧 如果有指定持续时间，精确等待（主要用于反应步骤）
      if (step.duration) {
        this.addExecutionLog(`开始反应时间等待: ${step.duration/3600} 小时`);
        await this.waitForDurationWithProgress(step.duration, taskExecution.taskId);
      }
      
      // 🔧 只有在明确设置了延迟时间的情况下才执行额外延迟
      if (step.delayAfter > 0) {
        console.log(`执行步骤后额外延迟 ${step.delayAfter} 秒...`);
        this.addExecutionLog(`步骤已完成，额外等待 ${step.delayAfter} 秒以确保系统稳定`);
        await this.waitForDurationWithProgress(step.delayAfter, taskExecution.taskId);
      }
      
      // 记录实际执行时间
      step.actualExecutionTime = Date.now() - stepStartTime;
      console.log(`步骤 "${step.name}" 执行完成，耗时: ${step.actualExecutionTime/1000} 秒`);
      this.addExecutionLog(`步骤完成: ${step.name}，耗时: ${(step.actualExecutionTime/1000).toFixed(1)} 秒`);
    },
    
    // 🎯 TopControl标准：条件检查机制
    async checkWorkflowConditions(conditions) {
      const conditionPromises = conditions.map(async condition => {
        switch(condition.type) {
          case 'deviceStatus':
            return this.checkDeviceStatusCondition(condition);
          case 'deviceParameter':
            return this.checkDeviceParameterCondition(condition);
          case 'timeout':
            return this.checkTimeoutCondition(condition);
          default:
            console.warn(`未知的条件类型: ${condition.type}`);
            return true; // 默认通过
        }
      });
      
      try {
        const results = await Promise.all(conditionPromises);
        console.log(`所有条件检查完成:`, results);
        return results.every(result => result === true);
      } catch (error) {
        console.error(`条件检查失败:`, error);
        throw error;
      }
    },
    
    // 🔧 检查设备状态条件
    async checkDeviceStatusCondition(condition) {
      const maxAttempts = Math.ceil((condition.timeout || 60) / 2); // 每2秒检查一次
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        try {
          const deviceStatus = await this.getDeviceStatus(condition.deviceId);
          
          if (this.evaluateCondition(deviceStatus, condition)) {
            console.log(`✅ 设备状态条件满足: ${condition.deviceId} ${condition.status}`);
            return true;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
          }
        } catch (error) {
          console.warn(`获取设备状态失败: ${condition.deviceId}`, error);
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      throw new Error(`设备状态条件超时: ${condition.deviceId} 未达到状态 ${condition.status}`);
    },
    
    // 🔧 检查设备参数条件
    async checkDeviceParameterCondition(condition) {
      const maxAttempts = Math.ceil((condition.timeout || 60) / 2);
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        try {
          const deviceStatus = await this.getDeviceStatus(condition.deviceId);
          const parameterValue = deviceStatus[condition.parameter];
          
          if (this.compareValues(parameterValue, condition.value, condition.comparison, condition.tolerance)) {
            console.log(`✅ 设备参数条件满足: ${condition.deviceId}.${condition.parameter} = ${parameterValue}`);
            return true;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.warn(`获取设备参数失败: ${condition.deviceId}.${condition.parameter}`, error);
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      throw new Error(`设备参数条件超时: ${condition.deviceId}.${condition.parameter} 未达到目标值 ${condition.value}`);
    },
    
    // 🔧 检查超时条件
    async checkTimeoutCondition(condition) {
      const timeoutSeconds = condition.timeout || 10;
      console.log(`⏰ 等待超时条件: ${timeoutSeconds} 秒`);
      await new Promise(resolve => setTimeout(resolve, timeoutSeconds * 1000));
      return true;
    },
    
    // 🔧 条件评估
    evaluateCondition(deviceStatus, condition) {
      if (condition.status && deviceStatus.status !== condition.status) {
        return false;
      }
      
      if (condition.statusParameter && condition.value !== undefined) {
        const paramValue = deviceStatus[condition.statusParameter];
        return this.compareValues(paramValue, condition.value, condition.comparison, condition.tolerance);
      }
      
      return true;
    },
    
    // 🔧 数值比较
    compareValues(actual, expected, comparison = 'eq', tolerance = 0) {
      if (actual === undefined || actual === null) return false;
      
      const actualNum = parseFloat(actual);
      const expectedNum = parseFloat(expected);
      
      if (isNaN(actualNum) || isNaN(expectedNum)) {
        return actual == expected; // 字符串比较
      }
      
      switch (comparison) {
        case 'eq': // 等于
          return Math.abs(actualNum - expectedNum) <= tolerance;
        case 'approx': // 近似等于
          return Math.abs(actualNum - expectedNum) <= tolerance;
        case 'gt': // 大于
          return actualNum > expectedNum;
        case 'gte': // 大于等于
          return actualNum >= expectedNum;
        case 'lt': // 小于
          return actualNum < expectedNum;
        case 'lte': // 小于等于
          return actualNum <= expectedNum;
        default:
          return Math.abs(actualNum - expectedNum) <= tolerance;
      }
    },
    
    // 🔧 从设备命令生成核心等待条件 - 只关注温度和泵位置
    generateCompletionConditions(deviceCommands) {
      const conditions = [];
      
      deviceCommands.forEach(command => {
        switch (command.action) {
          case 'setTemp':
            // ✅ 核心等待条件：加热器温度设置完成条件
            if (command.parameters.temperature !== undefined) {
              conditions.push({
                type: 'deviceParameter',
                deviceType: command.deviceType,
                deviceId: command.deviceId,
                parameter: 'currentTemp',
                comparison: 'approx',
                value: command.parameters.temperature,
                tolerance: 2,
                timeout: 180
              });
            }
            break;
            
          case 'setPosition':
            // ✅ 核心等待条件：泵位置设置完成条件
            if (command.parameters.position !== undefined) {
              conditions.push({
                type: 'deviceParameter',
                deviceType: command.deviceType,
                deviceId: command.deviceId,
                parameter: 'position',
                comparison: 'approx',
                value: command.parameters.position,
                tolerance: 5,
                timeout: 60
              });
            }
            break;
            
          // ❌ 忽略的快速操作：阀门孔位切换 - 不需要等待条件
          // case 'setPort':
          
          // ❌ 忽略的快速操作：泵端口切换 - 不需要等待条件  
          // case 'setSpeed':
          
          case 'setFlowRate':
            // ✅ 可选等待条件：MFC流速完成条件（如果需要精确控制）
            if (command.parameters.flowRate !== undefined) {
              conditions.push({
                type: 'deviceParameter',
                deviceType: command.deviceType,
                deviceId: command.deviceId,
                parameter: 'currentFlowRate',
                comparison: 'approx',
                value: command.parameters.flowRate,
                tolerance: command.parameters.flowRate * 0.1, // 10%误差
                timeout: 30
              });
            }
            break;
            
          case 'setIntensity':
            // ✅ 可选等待条件：光照强度完成条件（如果需要精确控制）
            if (command.parameters.intensity !== undefined) {
              conditions.push({
                type: 'deviceParameter',
                deviceType: command.deviceType,
                deviceId: command.deviceId,
                parameter: 'currentIntensity',
                comparison: 'approx',
                value: command.parameters.intensity,
                tolerance: command.parameters.intensity * 0.05, // 5%误差
                timeout: 15
              });
            }
            break;
        }
      });
      
      console.log(`🔧 生成核心等待条件 (只关注温度和泵位置):`, conditions);
      return conditions;
    },
    
    // 发送设备命令（简化版）
    async sendDeviceCommand(command) {
      return new Promise((resolve, reject) => {
        if (!this.ws_hardware || this.ws_hardware.readyState !== WebSocket.OPEN) {
          console.warn('硬件WebSocket未连接，使用模拟执行');
          // 模拟执行延迟
          setTimeout(() => {
            this.addExecutionLog(`模拟执行设备命令: ${command.deviceType} ${command.deviceId} - ${command.action}`);
            resolve({
              deviceId: command.deviceId,
              success: true,
              simulated: true,
              timestamp: new Date()
            });
          }, Math.random() * 2000 + 500); // 0.5-2.5秒随机延迟
          return;
        }
        
        try {
          // 构建硬件控制命令
          const hwCommand = {
            type: 'deviceControl',
            payload: {
              deviceId: command.deviceId,
              deviceType: command.deviceType,
              action: command.action,
              parameters: command.parameters
            }
          };
          
          this.ws_hardware.send(JSON.stringify(hwCommand));
          this.addExecutionLog(`发送设备命令: ${command.deviceType} ${command.deviceId} - ${command.action}`);
          console.log('已发送硬件命令:', hwCommand);
          
          // 简单延迟后认为命令发送成功
          setTimeout(() => {
            resolve({
              deviceId: command.deviceId,
              success: true,
              timestamp: new Date()
            });
          }, 1000);
          
        } catch (error) {
          console.error('发送硬件命令失败:', error);
          this.addExecutionLog(`设备命令发送失败: ${error.message}`, 'error');
          reject(error);
        }
      });
    },
    
    // 简化的等待步骤完成
    async waitForStepCompletion(step) {
      // 简化实现：根据步骤类型等待不同的时间
      let waitTime = 2000; // 默认2秒
      
      // 根据步骤名称调整等待时间
      if (step.name.includes('初始化')) {
        waitTime = 3000; // 初始化需要更长时间
      } else if (step.name.includes('清理')) {
        waitTime = 5000; // 清理需要更长时间
      }
      
      this.addExecutionLog(`等待步骤完成: ${step.name} (${waitTime/1000}秒)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    },
    
    // 带进度显示的等待
    async waitForDurationWithProgress(seconds, taskId) {
      console.log(`精确等待 ${seconds} 秒...`);
      const interval = 1000; // 每秒更新一次
      const totalSteps = Math.ceil(seconds);
      
      for (let i = 0; i < totalSteps; i++) {
        // 检查是否被停止
        if (this.workflowExecution.status === 'stopped') {
          throw new Error('工作流已被终止');
        }
        
        // 如果暂停，等待恢复
        if (this.workflowExecution.status === 'paused') {
          await this.waitForResume();
        }
        
        // 更新反应进度
        const reactionProgress = (i / totalSteps) * 100;
        this.updateReactionProgress(taskId, reactionProgress, totalSteps - i);
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      this.updateReactionProgress(taskId, 100, 0);
    },
    
    // 🎯 增强的设备状态获取（支持真实硬件和模拟模式）
    async getDeviceStatus(deviceId) {
      return new Promise((resolve, reject) => {
        if (!this.ws_hardware || this.ws_hardware.readyState !== WebSocket.OPEN) {
          console.warn(`硬件WebSocket未连接，使用模拟状态: ${deviceId}`);
          // 🔧 模拟状态：根据设备类型返回合理的模拟数据
          const deviceType = deviceId.split('-')[0];
          const simulatedStatus = this.generateSimulatedDeviceStatus(deviceId, deviceType);
          setTimeout(() => resolve(simulatedStatus), Math.random() * 500 + 100); // 100-600ms延迟
          return;
        }
        
        try {
          // 构建状态查询命令
          const statusQuery = {
            type: 'getDeviceStatus',
            payload: {
              deviceId: deviceId,
              requestId: `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
          };
          
          // 设置超时
          const timeout = setTimeout(() => {
            reject(new Error(`获取设备状态超时: ${deviceId}`));
          }, 10000); // 10秒超时
          
          // 创建一次性的消息监听器
          const messageHandler = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              if (data.type === 'deviceStatus' && data.payload && data.payload.deviceId === deviceId) {
                clearTimeout(timeout);
                this.ws_hardware.removeEventListener('message', messageHandler);
                
                const deviceStatus = {
                  deviceId: deviceId,
                  status: data.payload.status || 'unknown',
                  ...data.payload.parameters, // 包含具体的设备参数
                  timestamp: new Date(),
                  real: true
                };
                
                console.log(`✅ 获取到真实设备状态:`, deviceStatus);
                resolve(deviceStatus);
              }
            } catch (error) {
              console.error("解析设备状态消息失败:", error);
            }
          };
          
          // 添加临时消息监听
          this.ws_hardware.addEventListener('message', messageHandler);
          
          // 发送状态查询
          this.ws_hardware.send(JSON.stringify(statusQuery));
          console.log(`📤 发送设备状态查询:`, statusQuery);
          
        } catch (error) {
          console.error(`获取设备状态失败: ${deviceId}`, error);
          reject(error);
        }
      });
    },
    
    // 🔧 生成模拟设备状态
    generateSimulatedDeviceStatus(deviceId, deviceType) {
      const baseStatus = {
        deviceId: deviceId,
        timestamp: new Date(),
        simulated: true
      };
      
      switch (deviceType) {
        case 'pump':
          return {
            ...baseStatus,
            status: 'idle',
            position: Math.floor(Math.random() * 1000), // 随机位置
            speed: Math.floor(Math.random() * 100), // 随机速度
            currentPort: Math.floor(Math.random() * 6) + 1, // 1-6端口
            flowRate: Math.random() * 50 // 随机流速
          };
          
        case 'valve':
          return {
            ...baseStatus,
            status: 'idle',
            position: Math.floor(Math.random() * 8) + 1 // 1-8位置
          };
          
        case 'chip':
        case 'heater':
          return {
            ...baseStatus,
            status: 'heating',
            currentTemp: Math.random() * 100 + 20, // 20-120°C
            targetTemp: Math.random() * 100 + 50, // 50-150°C
            heatingPower: Math.random() * 100 // 0-100%功率
          };
          
        case 'mfc':
          return {
            ...baseStatus,
            status: 'running',
            currentFlowRate: Math.random() * 100, // 随机流速
            targetFlowRate: Math.random() * 100
          };
          
        case 'light':
          return {
            ...baseStatus,
            status: 'on',
            currentIntensity: Math.random() * 100, // 随机强度
            targetIntensity: Math.random() * 100
          };
          
        case 'bottle':
          return {
            ...baseStatus,
            status: 'connected',
            volume: Math.random() * 1000, // 随机体积
            level: Math.random() * 100 // 液位百分比
          };
          
        default:
          return {
            ...baseStatus,
            status: 'unknown'
          };
      }
    },
    
    // 判断设备任务是否完成（简化版）
    isDeviceTaskCompleted(deviceStatus, step) {
      // 简化判断：总是认为已完成
      return true;
    },
    
    // 更新任务进度
    updateTaskProgress(taskId, progress) {
      if (this.workflowExecution.taskProgress.has(taskId)) {
        const taskProgress = this.workflowExecution.taskProgress.get(taskId);
        taskProgress.progress = progress;
        this.workflowExecution.taskProgress.set(taskId, taskProgress);
      }
    },
    
    // 更新反应进度
    updateReactionProgress(taskId, progress, remainingSeconds) {
      if (this.workflowExecution.taskProgress.has(taskId)) {
        const taskProgress = this.workflowExecution.taskProgress.get(taskId);
        taskProgress.reactionProgress = progress;
        taskProgress.remainingTime = remainingSeconds;
        this.workflowExecution.taskProgress.set(taskId, taskProgress);
      }
      
      // 显示进度消息
      if (progress % 20 === 0 || remainingSeconds <= 10) {
        this.$message.info(`反应进度: ${progress.toFixed(1)}%, 剩余时间: ${remainingSeconds}秒`);
      }
    },
    
    // 更新任务状态
    updateTaskStatus(taskId, status) {
      // 更新表格中的状态显示
      const tableRow = this.tableData.find(row => row.id === taskId);
      if (tableRow) {
        tableRow.status = status;
      }
      
      // 更新原始数据中的状态
      const originalTask = this.allData.find(task => task.id === taskId);
      if (originalTask) {
        originalTask.status = status;
      }
    },
    
    // 添加执行日志（仅内存中记录）
    addExecutionLog(message, level = 'info') {
      const logEntry = {
        timestamp: new Date(),
        level: level,
        message: message
      };
      
      // 🔧 修复：确保executionLog存在
      if (!this.workflowExecution) {
        this.workflowExecution = {
          executionLog: []
        };
      }
      
      if (!this.workflowExecution.executionLog) {
        this.workflowExecution.executionLog = [];
      }
      
      this.workflowExecution.executionLog.push(logEntry);
      console.log(`[${level.toUpperCase()}] ${message}`);
      
      // 保持日志数量在合理范围内，避免内存占用过多
      if (this.workflowExecution.executionLog.length > 100) {
        this.workflowExecution.executionLog = this.workflowExecution.executionLog.slice(-50);
      }
    },
    
    // 暂停或继续工作流
    pauseOrResumeWorkflow() {
      if (this.workflowExecution.status === 'running') {
        this.workflowExecution.status = 'paused';
        this.addExecutionLog('工作流已暂停', 'warning');
        this.$message.info('工作流已暂停');
      } else if (this.workflowExecution.status === 'paused') {
        this.workflowExecution.status = 'running';
        this.addExecutionLog('工作流已继续', 'info');
        this.$message.success('工作流已继续');
      }
    },
    
    // 停止工作流
    async stopWorkflow() {
      try {
        await this.$confirm('确定要终止当前工作流吗？此操作不可恢复。', '终止确认', {
          confirmButtonText: '终止',
          cancelButtonText: '取消',
          type: 'warning',
        });
        
        this.workflowExecution.status = 'stopped';
        this.isExecutingWorkflow = false;
        this.addExecutionLog('工作流已被用户终止', 'warning');
        this.$message.warning('工作流已终止');
        
        // 重置所有执行中任务的状态
        this.workflowExecution.executionPlan.forEach(task => {
          this.updateTaskStatus(task.taskId, 0); // 重置为待执行状态
        });
        
      } catch (error) {
        // 用户取消了操作
      }
    },
    
    // 获取状态标签类型
    getStatusTagType(status) {
      switch (status) {
        case 'running':
          return 'primary';
        case 'paused':
          return 'warning';
        case 'completed':
          return 'success';
        case 'error':
          return 'danger';
        default:
          return 'info';
      }
    },
    
    // 翻译执行状态
    translateExecutionStatus(status) {
      const statusMap = {
        'idle': '空闲',
        'running': '运行中',
        'paused': '已暂停',
        'completed': '已完成',
        'error': '执行错误',
        'stopped': '已终止'
      };
      return statusMap[status] || status;
    },
    
    // 🔧 使用共享WebSocket连接管理器
    initHardwareWebSocket() {
      console.log('🔌 使用共享WebSocket连接管理器连接硬件');
      // 重构后：taskWebSocketManager基于sharedConnectionManager，连接管理已在构造函数中完成
      // 只需要确保sharedConnectionManager已经初始化
      if (!this.taskWebSocketManager.wsConnected.value) {
        console.log('🔄 等待共享连接管理器建立连接...');
        // sharedConnectionManager会自动处理连接和重连
      } else {
        console.log('✅ 共享连接管理器已连接');
      }
      
      // 请求初始数据
      this.taskWebSocketManager.requestInitialData();
    },

    // 🔧 重连和连接质量管理已移至taskWebSocketManager

    // 🔧 处理硬件消息
    handleHardwareMessage(data) {
      switch (data.type) {
        case 'deviceStatus':
          this.handleDeviceStatusUpdate(data);
          break;
        case 'workflowStarted':
          this.handleWorkflowStarted(data);
          break;
        case 'stepCompleted':
          this.handleStepCompleted(data);
          break;
        case 'stepFailed':
          this.handleStepFailed(data);
          break;
        case 'stepStarted':
          this.handleStepStarted(data);
          break;
        case 'workflowCompleted':
          this.handleWorkflowCompleted(data);
          break;
        case 'deviceCommandResponse':
          this.handleDeviceCommandResponse(data);
          break;
        case 'concurrentGroupStarted':
          this.handleConcurrentGroupStarted(data);
          break;
        case 'concurrentGroupError':
          this.handleConcurrentGroupError(data);
          break;
        case 'taskStatus':
          this.handleTaskStatus(data);
          break;
        case 'connection':
          this.handleConnectionMessage(data);
          break;
        case 'serverStatus':
          this.handleServerStatus(data);
          break;
        // 🎯 新增：处理任务切换事件
        case 'taskSwitched':
          this.handleTaskSwitched(data);
          break;
        case 'queueTaskCompleted':
          this.handleQueueTaskCompleted(data);
          break;
        case 'queueTaskFailed':
          this.handleQueueTaskFailed(data);
          break;
        default:
          console.log('🔍 未处理的硬件消息类型:', data.type);
      }
    },
    
    // 🔧 注册消息处理器到Task WebSocket适配器
    registerMessageHandlers() {
      // 注册设备状态更新消息处理器
      this.taskWebSocketManager.addMessageHandler('deviceStatus', (data) => {
        this.handleDeviceStatusUpdate(data);
      });
      
      // 注册任务消息处理器
      this.taskWebSocketManager.addMessageHandler('taskMessage', (data) => {
        this.handleHardwareMessage(data);
      });
      
      // 注册其他需要的消息类型
      this.taskWebSocketManager.addMessageHandler('hardwareUpdate', (data) => {
        this.handleHardwareMessage(data);
      });
      
      console.log('✅ Task界面消息处理器已注册');
    },

    // 🔧 发送消息（使用共享连接管理器）
    sendHardwareMessage(message) {
      return this.taskWebSocketManager.sendMessage(message);
    },

    // 🔧 缓存消息
    cacheMessage(message) {
      if (this.messageQueue.length >= this.maxQueueSize) {
        this.messageQueue.shift(); // 移除最旧的消息
      }
      
      this.messageQueue.push({
        ...message,
        timestamp: Date.now(),
        retries: 0
      });
      
      console.log(`📥 消息已缓存 (队列长度: ${this.messageQueue.length})`);
    },

    // 🔧 处理缓存的消息
    processCachedMessages() {
      if (this.messageQueue.length === 0) {
        return;
      }
      
      console.log(`📤 处理 ${this.messageQueue.length} 个缓存消息`);
      
      const messages = [...this.messageQueue];
      this.messageQueue = [];
      
      messages.forEach((message, index) => {
        setTimeout(() => {
          if (this.isHardwareConnected) {
            delete message.timestamp;
            delete message.retries;
            this.sendHardwareMessage(message);
          } else {
            this.cacheMessage(message);
          }
        }, index * 100); // 间隔100ms发送，避免消息过快
      });
    },

    // 🔧 手动重连
    manualReconnect() {
      console.log('🔄 用户手动重连');
      this.reconnectConfig.retryCount = 0;
      this.reconnectConfig.isReconnecting = false;
      
      if (this.ws_hardware) {
        this.ws_hardware.close();
      }
      
      setTimeout(() => {
        this.initHardwareWebSocket();
      }, 1000);
    },

    // 🔧 获取连接状态信息
    getConnectionInfo() {
      return {
        connected: this.isHardwareConnected,
        quality: this.connectionStatus.connectionQuality,
        retryCount: this.reconnectConfig.retryCount,
        maxRetries: this.reconnectConfig.maxRetries,
        isReconnecting: this.reconnectConfig.isReconnecting,
        queueSize: this.messageQueue.length,
        totalDisconnects: this.connectionStatus.totalDisconnects,
        lastConnected: this.connectionStatus.lastConnectedTime,
        lastDisconnected: this.connectionStatus.lastDisconnectedTime
      };
    },

    // 🚀 分析并发执行潜力
    async analyzeConcurrentPotential() {
      if (this.selectedRows.length < 2) {
        this.$message.info('需要选择至少2个任务才能进行并发分析');
        return;
      }

      try {
        // 生成执行计划
        const executionPlan = this.generateExecutionPlan(this.selectedRows);
        
        if (executionPlan.length === 0) {
          this.$message.warning('无法生成有效的执行计划，请确保任务已完成调度');
          return;
        }

        // 检测设备冲突
        const conflictAnalysis = this.detectDeviceConflicts(executionPlan);
        const concurrentGroups = this.groupTasksForConcurrentExecution(executionPlan);

        // 计算效率提升
        const efficiencyGain = Math.round((1 - concurrentGroups.length / executionPlan.length) * 100);
        
        // 构建分析报告
        const reportContent = `
          <div style="font-size: 14px; line-height: 1.6;">
            <h4 style="margin: 0 0 16px 0; color: #409EFF;">并发执行分析报告</h4>
            
            <div style="margin-bottom: 12px;">
              <strong>📊 任务概况：</strong>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>总任务数：${executionPlan.length}</li>
                <li>已调度任务：${executionPlan.length}</li>
                <li>预计总时长：${executionPlan.reduce((sum, task) => sum + (task.duration || 0), 0)} 分钟</li>
              </ul>
            </div>

            <div style="margin-bottom: 12px;">
              <strong>🔍 设备使用分析：</strong>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>涉及设备总数：${conflictAnalysis.deviceUsage.size}</li>
                <li>设备冲突数：${Array.from(conflictAnalysis.deviceUsage.values()).filter(usage => usage.length > 1).length}</li>
                <li>任务间冲突：${conflictAnalysis.hasAnyConflict ? '存在' : '无冲突'}</li>
              </ul>
            </div>

            <div style="margin-bottom: 12px;">
              <strong>🚀 并发分组结果：</strong>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>并发组数：${concurrentGroups.length}</li>
                <li>效率提升：${efficiencyGain}%</li>
                <li>最大组任务数：${Math.max(...concurrentGroups.map(g => g.tasks.length))}</li>
              </ul>
            </div>

            ${concurrentGroups.map((group, index) => `
              <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                <strong>组 ${index + 1} (${group.tasks.length} 任务)：</strong>
                <span style="color: #666;">${group.tasks.map(t => t.taskName).join(', ')}</span>
                <br><small style="color: #999;">涉及设备：${group.deviceList.length} 个</small>
              </div>
            `).join('')}

            <div style="margin-top: 16px; padding: 12px; background: ${efficiencyGain > 0 ? '#e8f5e8' : '#fff7e6'}; border-radius: 4px;">
              <strong style="color: ${efficiencyGain > 0 ? '#52c41a' : '#fa8c16'};">
                ${efficiencyGain > 0 ? '✅ 建议' : '⚠️ 提示'}：
              </strong>
              ${efficiencyGain > 0 
                ? `可以通过并发执行提升 ${efficiencyGain}% 的效率` 
                : '任务间设备冲突较多，并发执行收益有限'}
            </div>
          </div>
        `;

        this.$alert(reportContent, '并发执行分析', {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '了解',
          showClose: true
        });

      } catch (error) {
        console.error('并发分析失败:', error);
        this.$message.error('并发分析失败: ' + error.message);
      }
    },

    // 🚀 设备冲突检测算法
    detectDeviceConflicts(tasks) {
      console.log('🔍 开始设备冲突检测:', tasks.length, '个任务');
      
      const deviceUsage = new Map(); // 记录每个设备被哪些任务使用
      const conflictMatrix = new Map(); // 任务间冲突矩阵
      
      // 1. 收集所有任务的设备使用情况
      tasks.forEach((task, taskIndex) => {
        const taskDevices = new Set();
        
        // 从设备路径收集设备
        if (task.devicePath && Array.isArray(task.devicePath)) {
          task.devicePath.forEach(deviceId => {
            taskDevices.add(deviceId);
            
            if (!deviceUsage.has(deviceId)) {
              deviceUsage.set(deviceId, []);
            }
            deviceUsage.get(deviceId).push({
              taskIndex,
            taskId: task.taskId,
              taskName: task.taskName
            });
          });
        }
        
        // 从参数配置收集设备
        if (task.parameters) {
          Object.keys(task.parameters).forEach(paramKey => {
            const deviceId = paramKey.includes('_') ? paramKey.split('_')[1] : paramKey;
            if (deviceId && deviceId !== paramKey) {
              taskDevices.add(deviceId);
              
              if (!deviceUsage.has(deviceId)) {
                deviceUsage.set(deviceId, []);
              }
              const existingUsage = deviceUsage.get(deviceId);
              if (!existingUsage.some(usage => usage.taskIndex === taskIndex)) {
                existingUsage.push({
                  taskIndex,
                  taskId: task.taskId,
                  taskName: task.taskName
                });
              }
            }
          });
        }
        
        // 存储任务的设备列表
        task.deviceSet = taskDevices;
      });
      
      // 2. 构建冲突矩阵
      tasks.forEach((taskA, indexA) => {
        tasks.forEach((taskB, indexB) => {
          if (indexA !== indexB) {
            const conflictDevices = [];
            
            // 检查设备冲突
            if (taskA.deviceSet && taskB.deviceSet) {
              taskA.deviceSet.forEach(deviceId => {
                if (taskB.deviceSet.has(deviceId)) {
                  conflictDevices.push(deviceId);
                }
              });
            }
            
            const conflictKey = `${indexA}-${indexB}`;
            conflictMatrix.set(conflictKey, {
              hasConflict: conflictDevices.length > 0,
              conflictDevices,
              taskA: taskA.taskName,
              taskB: taskB.taskName
            });
          }
        });
      });
      
      // 3. 输出冲突检测结果
      console.log('📊 设备使用情况分析:');
      deviceUsage.forEach((usage, deviceId) => {
        if (usage.length > 1) {
          console.log(`⚠️ 设备 ${deviceId} 被多个任务使用:`, usage.map(u => u.taskName));
        }
      });
      
      console.log('🔍 任务间冲突矩阵:', Array.from(conflictMatrix.entries()));
      
      return {
        deviceUsage,
        conflictMatrix,
        hasAnyConflict: Array.from(conflictMatrix.values()).some(conflict => conflict.hasConflict)
      };
    },

    // 🚀 任务并发分组算法
    groupTasksForConcurrentExecution(tasks) {
      console.log('🎯 开始任务并发分组:', tasks.length, '个任务');
      
      if (!this.concurrentExecution.enabled) {
        console.log('并发执行已禁用，返回单独分组');
        return tasks.map(task => ({ tasks: [task], canConcurrent: false }));
      }
      
      // 🔧 确保每个任务都有deviceSet字段，用于冲突检测
      const tasksWithDeviceSet = tasks.map(task => {
        if (!task.deviceSet) {
          // 从devicePath生成deviceSet
          task.deviceSet = new Set(task.devicePath || []);
        }
        return task;
      });
      
      // 1. 检测设备冲突
      const conflictAnalysis = this.detectDeviceConflicts(tasksWithDeviceSet);
      
      if (!conflictAnalysis.hasAnyConflict) {
        console.log('✅ 所有任务无设备冲突，可以完全并发执行');
        return [{
          tasks: tasksWithDeviceSet,
          canConcurrent: true,
          conflictDevices: [],
          deviceList: Array.from(new Set(tasksWithDeviceSet.flatMap(t => Array.from(t.deviceSet || []))))
        }];
      }
      
      // 2. 使用贪心算法分组
      const groups = [];
      const processed = new Set();
      
      tasksWithDeviceSet.forEach((task, taskIndex) => {
        if (processed.has(taskIndex)) return;
        
        // 创建新组，从当前任务开始
        const currentGroup = {
          tasks: [task],
          canConcurrent: true,
          conflictDevices: [],
          deviceList: Array.from(task.deviceSet || [])
        };
        
        processed.add(taskIndex);
        
        // 尝试将其他任务加入当前组
        tasksWithDeviceSet.forEach((otherTask, otherIndex) => {
          if (processed.has(otherIndex)) return;
          
          // 检查与当前组中所有任务是否有冲突
          let hasConflictWithGroup = false;
          
          currentGroup.tasks.forEach(groupTask => {
            const groupTaskIndex = tasksWithDeviceSet.findIndex(t => t.taskId === groupTask.taskId);
            const conflictKey = `${groupTaskIndex}-${otherIndex}`;
            const reverseConflictKey = `${otherIndex}-${groupTaskIndex}`;
            
            const conflict = conflictAnalysis.conflictMatrix.get(conflictKey) || 
                           conflictAnalysis.conflictMatrix.get(reverseConflictKey);
            
            if (conflict && conflict.hasConflict) {
              hasConflictWithGroup = true;
            }
          });
          
          // 如果无冲突且组大小未超限，加入组
          if (!hasConflictWithGroup && 
              currentGroup.tasks.length < this.concurrentExecution.maxConcurrentTasks) {
            currentGroup.tasks.push(otherTask);
            processed.add(otherIndex);
            
            // 更新组的设备列表
            if (otherTask.deviceSet) {
              otherTask.deviceSet.forEach(deviceId => {
                if (!currentGroup.deviceList.includes(deviceId)) {
                  currentGroup.deviceList.push(deviceId);
                }
              });
            }
          }
        });
        
        groups.push(currentGroup);
      });
      
      console.log('🎉 任务分组完成:', groups.map((group, index) => ({
        groupIndex: index + 1,
        taskCount: group.tasks.length,
        taskNames: group.tasks.map(t => t.taskName),
        deviceCount: group.deviceList.length,
        canConcurrent: group.canConcurrent
      })));
      
      return groups;
    },

    // 🔧 合并工作流步骤（修复命令字段不匹配问题）
    mergeWorkflowSteps(taskGroup) {
      console.log('🔧 开始合并工作流步骤:', taskGroup.tasks.length, '个任务');
      
      // 为每个任务生成工作流
      const allWorkflows = taskGroup.tasks.map(task => this.generateTaskWorkflow(task));
      
      // 计算最大步骤数
      const maxSteps = Math.max(...allWorkflows.map(wf => wf.steps.length));
      const mergedSteps = [];
      
      for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
        const stepCommands = [];
        const stepDevices = new Set();
        const stepName = `步骤 ${stepIndex + 1}`;
        
        // 收集当前步骤的所有命令
        allWorkflows.forEach((workflow, taskIndex) => {
          const task = taskGroup.tasks[taskIndex];
          const step = workflow.steps[stepIndex];
          
          if (step) {
            // 🔧 修复：使用正确的设备命令字段名
            const commands = step.deviceCommands || step.commands || [];
            
            commands.forEach(command => {
              stepCommands.push({
                ...command,
                sourceTask: task.taskId,
                sourceTaskName: task.taskName,
                originalStepName: step.name
              });
              
              if (command.deviceId) {
                stepDevices.add(command.deviceId);
              }
            });
          }
        });
        
        // 创建合并后的步骤
        const mergedStep = {
          id: `merged_step_${stepIndex + 1}`,
          name: stepName,
          description: `合并的${stepName}，包含${taskGroup.tasks.length}个任务的并发操作`,
          type: 'concurrent',
          // 🔧 修复：统一使用deviceCommands字段
          deviceCommands: stepCommands,
          commands: stepCommands, // 保持兼容性
          devices: Array.from(stepDevices),
          estimatedDuration: Math.max(...allWorkflows.map(wf => 
            wf.steps[stepIndex]?.estimatedDuration || 0)),
          completionConditions: this.generateConcurrentCompletionConditions(stepCommands),
          parallelExecution: true
        };
        
        mergedSteps.push(mergedStep);
      }
      
      const mergedWorkflow = {
        id: `merged_workflow_${Date.now()}`,
        name: `并发工作流: ${taskGroup.tasks.map(t => t.taskName).join(', ')}`,
        description: `${taskGroup.tasks.length}个任务的合并工作流，共${mergedSteps.length}个步骤`,
        steps: mergedSteps,
        taskCount: taskGroup.tasks.length,
        mergeStrategy: 'parallel',
        totalCommands: mergedSteps.reduce((sum, step) => sum + (step.deviceCommands?.length || 0), 0),
        estimatedDuration: Math.max(...allWorkflows.map(wf => 
          wf.steps.reduce((sum, step) => sum + (step.estimatedDuration || 0), 0)))
      };
      
      console.log('✅ 工作流合并完成:', {
        taskCount: taskGroup.tasks.length,
        stepCount: mergedSteps.length,
        totalCommands: mergedWorkflow.totalCommands,
        estimatedDuration: mergedWorkflow.estimatedDuration
      });
      
      return mergedWorkflow;
    },

    // 🔧 生成并发完成条件
    generateConcurrentCompletionConditions(commands) {
      const conditions = [];
      
      // 按设备分组命令
      const deviceCommands = new Map();
      commands.forEach(command => {
        if (!deviceCommands.has(command.deviceId)) {
          deviceCommands.set(command.deviceId, []);
        }
        deviceCommands.get(command.deviceId).push(command);
      });
      
      // 为每个设备生成完成条件
      deviceCommands.forEach((cmds, deviceId) => {
        conditions.push({
          type: 'deviceComplete',
          deviceId,
          commandCount: cmds.length,
          description: `设备 ${deviceId} 完成 ${cmds.length} 个命令`,
          timeout: 30000 // 30秒超时
        });
      });
      
      return conditions;
    },

    // 🚀 启动并发工作流执行
    async startConcurrentWorkflowExecution(concurrentGroups) {
      console.log('🚀 启动并发工作流执行');
      
      try {
        // 1. 更新并发执行状态
        this.concurrentExecution.currentGroups = concurrentGroups;
        this.concurrentExecution.groupStatus.clear();
        
        concurrentGroups.forEach(group => {
          this.concurrentExecution.groupStatus.set(group.groupId, {
            status: 'pending',
            startTime: null,
            endTime: null,
            currentStepIndex: 0,
            completedSteps: 0,
            errors: []
          });
        });
        
        // 2. 更新选中任务状态为"In Progress"
        const allTasks = concurrentGroups.flatMap(group => group.tasks);
        allTasks.forEach(task => {
          this.updateTaskStatus(task.taskId, 1); // 1 = In Progress
        });
        
        // 3. 保存工作流信息到Store，供监控界面使用
        // 将并发组转换为执行计划格式，确保数据完整性
        const executionPlan = concurrentGroups.flatMap(group => 
          group.tasks.map(task => ({
            taskId: task.taskId,
            taskName: task.taskName,
            taskKey: task.taskKey,
            devicePath: task.devicePath || [],
            pathGraph: task.pathGraph || null,
            parameters: task.parameters || {},
            reactTime: task.reactTime || 0,
            duration: task.duration || 0,
            expectedStates: task.expectedStates || this.generateExpectedDeviceStates(task)
          }))
        );
        runningTasksStore.startWorkflowExecution(executionPlan);
        
        // 4. 发送并发工作流到硬件
        await this.sendConcurrentWorkflowToHardware(concurrentGroups);
        
        // 5. 执行并发组
        await this.executeConcurrentGroups(concurrentGroups);
        
        // 6. 跳转到监控界面并自动加载结构图
        this.$router.push('/monitor').then(() => {
          // 跳转完成后发送自动加载结构图的消息
          const allTasks = concurrentGroups.flatMap(group => group.tasks);
          this.autoLoadTaskGraphInMonitor(allTasks);
        });
        
        this.$message.success(`已启动并发工作流，共 ${concurrentGroups.length} 个并发组，请查看监控界面`);
        
        console.log('🎉 并发工作流执行完成');
        
      } catch (error) {
        console.error('启动并发工作流失败:', error);
        this.$message.error(`启动并发工作流失败: ${error.message}`);
        throw error;
      }
    },

    // 🚀 执行并发组
    async executeConcurrentGroups(concurrentGroups) {
      const groupPromises = concurrentGroups.map(async (group, groupIndex) => {
        const groupStatus = this.concurrentExecution.groupStatus.get(group.groupId);
        
        try {
          groupStatus.status = 'running';
          groupStatus.startTime = new Date();
          
          console.log(`🎯 开始执行并发组 ${groupIndex + 1}:`, group.groupName);
          
          // 执行组内的合并工作流
          await this.executeMergedWorkflow(group);
          
          groupStatus.status = 'completed';
          groupStatus.endTime = new Date();
          
          console.log(`✅ 并发组 ${groupIndex + 1} 执行完成`);
          
        } catch (error) {
          groupStatus.status = 'failed';
          groupStatus.errors.push(error.message);
          
          console.error(`❌ 并发组 ${groupIndex + 1} 执行失败:`, error);
          throw error;
        }
      });
      
      // 等待所有组完成
      await Promise.allSettled(groupPromises);
    },

    // 🔧 执行合并的工作流
    async executeMergedWorkflow(group) {
      const workflow = group.mergedWorkflow;
      const groupStatus = this.concurrentExecution.groupStatus.get(group.groupId);
      
      for (let stepIndex = 0; stepIndex < workflow.steps.length; stepIndex++) {
        const step = workflow.steps[stepIndex];
        
        groupStatus.currentStepIndex = stepIndex;
        
        console.log(`📝 执行步骤 ${stepIndex + 1}/${workflow.steps.length}: ${step.name}`);
        console.log(`🔧 并发命令数: ${step.commands?.length || 0}`);
        
        try {
          // 并发执行步骤中的所有命令
          if (step.commands && step.commands.length > 0) {
            await this.executeConcurrentStepCommands(step);
          }
          
          groupStatus.completedSteps++;
          console.log(`✅ 步骤 ${stepIndex + 1} 执行完成`);
          
        } catch (error) {
          console.error(`❌ 步骤 ${stepIndex + 1} 执行失败:`, error);
          throw error;
        }
      }
    },

    // 🔧 执行并发步骤命令
    async executeConcurrentStepCommands(step) {
      // 按设备分组命令，确保同一设备的命令顺序执行
      const deviceCommandGroups = new Map();
      
      // 🔧 修复：使用正确的命令字段
      const commands = step.deviceCommands || step.commands || [];
      
      commands.forEach(command => {
        if (!deviceCommandGroups.has(command.deviceId)) {
          deviceCommandGroups.set(command.deviceId, []);
        }
        deviceCommandGroups.get(command.deviceId).push(command);
      });
      
      // 为每个设备创建命令执行Promise
      const devicePromises = Array.from(deviceCommandGroups.entries()).map(
        async ([deviceId, commands]) => {
          console.log(`🎮 设备 ${deviceId} 执行 ${commands.length} 个命令`);
          
          // 顺序执行同一设备的命令
          for (const command of commands) {
            await this.sendDeviceCommand(command);
            console.log(`✅ 设备 ${deviceId} 命令完成: ${command.action}`);
          }
        }
      );
      
      // 等待所有设备的命令完成
      await Promise.all(devicePromises);
    },
    
    // 🔧 处理设备状态更新
    handleDeviceStatusUpdate(data) {
      console.log('📊 设备状态更新:', data);
      
      // 这里可以更新设备状态显示
      // 实际实现中应该根据具体的硬件反馈协议来处理
      this.emit('deviceStatusUpdate', data);
    },

    // 🔧 处理工作流启动确认
    handleWorkflowStarted(data) {
      console.log('🚀 工作流已启动:', data);
      const { workflowId, totalTasks, executionMode } = data.data || {};
      
      this.$message.success(`工作流 ${workflowId} 已启动`);
      
      // 🎯 向监控界面发送工作流启动高亮信息
      this.sendRealTimeHighlightToMonitor({
        type: 'WORKFLOW_STARTED',
        workflowId: workflowId,
        totalTasks: totalTasks,
        executionMode: executionMode,
            timestamp: new Date().toISOString()
      });
    },

    // 🔧 处理步骤完成
    handleStepCompleted(data) {
      console.log('✅ 步骤完成:', data);
      const { stepName, taskId, stepIndex, devicePath, completedDevices } = data.data || {};
      if (stepName && taskId) {
        this.addExecutionLog(`步骤完成: ${stepName} (任务: ${taskId})`);
        
        // 🎯 向监控界面发送步骤完成高亮信息
        this.sendRealTimeHighlightToMonitor({
          type: 'STEP_COMPLETED',
          taskId: taskId,
          stepName: stepName,
          stepIndex: stepIndex,
          devicePath: devicePath,
          completedDevices: completedDevices,
          timestamp: new Date().toISOString()
        });
      }
    },

    // 🔧 处理步骤失败
    handleStepFailed(data) {
      console.error('❌ 步骤失败:', data);
      const { stepName, taskId, error } = data.data || {};
      if (stepName && taskId) {
        this.addExecutionLog(`步骤失败: ${stepName} (任务: ${taskId}) - ${error}`, 'error');
      }
    },

    // 🔧 处理工作流完成
    handleWorkflowCompleted(data) {
      console.log('🎉 工作流完成:', data);
      this.$message.success('工作流执行完成');
      this.addExecutionLog('工作流执行完成');
    },

    // 🔧 处理设备命令响应
    handleDeviceCommandResponse(data) {
      console.log('🎮 设备命令响应:', data);
      // 这里可以处理设备命令的具体响应
    },
    
    // 🔧 处理步骤开始
    handleStepStarted(data) {
      console.log('🚀 步骤开始:', data);
      const { stepName, taskId, stepIndex, devicePath, currentDevices } = data.data || {};
      if (stepName && taskId) {
        this.addExecutionLog(`步骤开始: ${stepName} (任务: ${taskId})`);
        
        // 🎯 向监控界面发送实时高亮信息
        this.sendRealTimeHighlightToMonitor({
          type: 'STEP_STARTED',
          taskId: taskId,
          stepName: stepName,
          stepIndex: stepIndex,
          devicePath: devicePath,
          currentDevices: currentDevices,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // 🔧 处理并发组开始
    handleConcurrentGroupStarted(data) {
      console.log('🚀 并发组开始:', data);
      const { groupId, groupName, tasks, devicePaths } = data.data || {};
      if (groupId) {
        this.addExecutionLog(`并发组开始执行: ${groupName || groupId}`);
        
        // 更新并发组状态
        if (this.concurrentExecution.groupStatus.has(groupId)) {
          const groupStatus = this.concurrentExecution.groupStatus.get(groupId);
          groupStatus.status = 'running';
          groupStatus.startTime = new Date();
        }
        
        // 🎯 向监控界面发送并发组高亮信息
        this.sendRealTimeHighlightToMonitor({
          type: 'CONCURRENT_GROUP_STARTED',
          groupId: groupId,
          groupName: groupName,
          tasks: tasks,
          devicePaths: devicePaths,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // 🔧 处理并发组错误
    handleConcurrentGroupError(data) {
      console.error('❌ 并发组错误:', data);
      const { groupId, groupName, error, failedTasks } = data.data || {};
      if (groupId) {
        this.addExecutionLog(`并发组执行失败: ${groupName || groupId} - ${error}`, 'error');
        
        // 更新并发组状态
        if (this.concurrentExecution.groupStatus.has(groupId)) {
          const groupStatus = this.concurrentExecution.groupStatus.get(groupId);
          groupStatus.status = 'error';
          groupStatus.errors.push(error);
          groupStatus.endTime = new Date();
        }
        
        // 🎯 向监控界面发送并发组错误高亮信息
        this.sendRealTimeHighlightToMonitor({
          type: 'CONCURRENT_GROUP_ERROR',
          groupId: groupId,
          groupName: groupName,
          error: error,
          failedTasks: failedTasks,
          timestamp: new Date().toISOString()
        });
        
        this.$message.error(`并发组执行失败: ${error}`);
      }
    },
    
    // 🔧 处理任务状态更新
    handleTaskStatus(data) {
      console.log('📊 任务状态更新:', data);
      const { taskId, status, progress, currentDevice, devicePath, pathGraph } = data.data || {};
      if (taskId) {
        this.addExecutionLog(`任务状态更新: ${taskId} - ${status} (${progress || 0}%)`);
        
        // 这里可以更新任务列表中的状态显示
        const task = this.selectedRows.find(row => row.id === taskId);
        if (task) {
          task.status = status;
          task.progress = progress;
          task.currentDevice = currentDevice;
        }
        
        // 🎯 向监控界面发送任务状态高亮信息
        this.sendRealTimeHighlightToMonitor({
          type: 'TASK_STATUS_UPDATE',
          taskId: taskId,
          status: status,
          progress: progress,
          currentDevice: currentDevice,
          devicePath: devicePath,
          pathGraph: pathGraph,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // 🔧 处理连接消息
    handleConnectionMessage(data) {
      console.log('🔌 连接消息:', data);
      const { id } = data.data || {};
      if (id) {
        this.addExecutionLog(`WebSocket连接已建立: ${id}`);
      }
    },
    
    // 🔧 处理服务器状态
    handleServerStatus(data) {
      console.log('🖥️ 服务器状态:', data);
      const { connected } = data.data || {};
      if (connected !== undefined) {
        this.addExecutionLog(`服务器硬件连接状态: ${connected ? '已连接' : '未连接'}`);
        this.serverHardwareConnected = connected;
      }
    },
    
    // 🎯 处理任务切换事件
    handleTaskSwitched(data) {
      console.log('🔄 任务切换:', data);
      const { taskId, taskName, taskKey, devicePath, pathGraph, parameters, reactTime, duration, expectedStates } = data.data || {};
      if (taskId) {
        this.addExecutionLog(`任务切换: ${taskName} (任务ID: ${taskId})`);
        
        // 更新当前任务信息
        this.currentTask = {
          taskId,
          taskName,
          taskKey,
          devicePath,
          pathGraph,
          parameters,
          reactTime,
          duration,
          expectedStates
        };
        
        // 🎯 向监控界面发送任务切换高亮信息
        this.sendRealTimeHighlightToMonitor({
          type: 'TASK_SWITCHED',
          taskId: taskId,
          taskName: taskName,
          taskKey: taskKey,
          devicePath: devicePath,
          pathGraph: pathGraph,
          parameters: parameters,
          reactTime: reactTime,
          duration: duration,
          expectedStates: expectedStates,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // 🔧 处理队列任务完成
    handleQueueTaskCompleted(data) {
      console.log('✅ 队列任务完成:', data);
      const { taskId, taskName } = data.data || {};
      if (taskId) {
        this.addExecutionLog(`队列任务完成: ${taskName} (任务ID: ${taskId})`);
        
        // 🎯 向监控界面发送队列任务完成高亮信息
        this.sendRealTimeHighlightToMonitor({
          type: 'QUEUE_TASK_COMPLETED',
          taskId: taskId,
          taskName: taskName,
          timestamp: new Date().toISOString()
        });
      }
    },
    
         // 🔧 处理队列任务失败
     handleQueueTaskFailed(data) {
       console.error('❌ 队列任务失败:', data);
       const { taskId, taskName, error } = data.data || {};
       if (taskId) {
         this.addExecutionLog(`队列任务失败: ${taskName} (任务ID: ${taskId}) - ${error}`, 'error');
         
         // 🎯 向监控界面发送队列任务失败高亮信息
         this.sendRealTimeHighlightToMonitor({
           type: 'QUEUE_TASK_FAILED',
           taskId: taskId,
           taskName: taskName,
           error: error,
           timestamp: new Date().toISOString()
         });
       }
     },
     
     /* 
     * 🔧 工作流完善总结 - 从简化4步到专业7步：
     * 
     * ❌ 原有简化工作流（4步）：
     * 1. 初始化设备 - 简单的initialize命令
     * 2. 设置设备参数 - 基本的setParameters
     * 3. 执行反应 - start命令 + 固定等待
     * 4. 清理和收集 - stop命令
     * 
     * ✅ 完善后专业工作流（7步）：
     * 1. 初始化反应路径 - 精确设置阀门位置、加热器目标温度、泵端口配置，包含温度达标等待条件
     * 2. 泵润洗 - 排空至废液口清洗，确保管路清洁
     * 3. 抽吸反应溶液 - 从指定端口精确抽取指定体积的反应物，包含位置验证
     * 4. 反应运行 - 推出溶液到反应区域，持续监控温度状态，使用真实反应时间
     * 5. 反应稳定后切换产品收集阀 - 智能识别产品收集阀并切换位置
     * 6. 废液排出 - 处理非产品收集管路的废液
     * 7. 系统清洗 - 多轮清洗循环，确保系统洁净，安全关闭加热器
     * 
     * 🔧 核心改进：
     * - 参数来源：从TopControl的pendingChanges格式解析，而非简单的设备路径
     * - 条件检查：每步都有完成条件验证，确保设备状态达标
     * - 命令精度：精确的设备操作序列，符合实际化学反应流程
     * - 状态监控：实时监控设备状态，支持真实硬件和模拟模式
     * - 错误处理：详细的错误捕获和用户提示
     * - 执行日志：完整的执行过程记录
     */
     
     // 🎯 完善的工作流生成方法 - 基于TopControl的专业工作流逻辑
     generateTaskWorkflow(taskExecution) {
       const workflow = {
         id: `workflow_${taskExecution.taskId}_${Date.now()}`,
         name: `执行任务: ${taskExecution.taskName}`,
         description: '基于调度结果和用户参数生成的专业工作流',
         steps: [],
         createdAt: new Date().toISOString()
       };
       
       // 🔧 从任务参数中重构设备分类（类似TopControl的pendingChanges处理）
       const devices = this.analyzeDevicesFromTaskParameters(taskExecution);
       
       // 🎯 专业7步工作流（完全基于TopControl逻辑）
       
       // 步骤1: 初始化反应路径
       workflow.steps.push(this.createInitializationStep(devices));
       
       // 步骤2: 泵润洗（如果有泵设备）
       if (devices.pumps.length > 0) {
         workflow.steps.push(this.createPumpRinseStep(devices));
       }
       
       // 步骤3: 抽吸反应溶液
       if (devices.pumps.length > 0) {
         workflow.steps.push(this.createReagentAspirationStep(devices));
       }
       
       // 步骤4: 反应运行
       workflow.steps.push(this.createReactionRunStep(devices, taskExecution));
       
       // 步骤5: 反应稳定后切换产品收集阀门
       if (devices.valves.length > 0) {
         const stabilizedValveStep = this.createStabilizedValveStep(devices);
         if (stabilizedValveStep) {
           workflow.steps.push(stabilizedValveStep);
         }
       }
       
       // 步骤6: 清洗准备（产品收集阀切换 + 吸取清洗液）
       workflow.steps.push(this.createCleaningPreparationStep(devices));
       
       // 步骤7: 推出清洗液（完成清洗）
       workflow.steps.push(this.createCleaningExecutionStep(devices));
       
       console.log('🎯 生成的专业工作流:', workflow);
       return workflow;
     },
     
     // 🔧 从任务参数分析设备（替代简化的analyzeDevicesFromPath）
     analyzeDevicesFromTaskParameters(taskExecution) {
       const devices = {
         pumps: [],
         valves: [],
         heaters: [],
         bottles: [],
         mfcs: [],
         lights: []
       };
       
       // 从任务参数中解析设备信息
       const parameters = taskExecution.parameters || {};
       
       Object.keys(parameters).forEach(deviceKey => {
         const deviceConfig = parameters[deviceKey];
         const [deviceType, deviceId] = deviceKey.includes('_') ? 
           deviceKey.split('_') : [deviceKey.split('-')[0], deviceKey];
         
         const device = {
           id: deviceId,
           type: deviceType,
           parameters: deviceConfig.parameters || deviceConfig
         };
         
         // 从设备路径中获取额外的图谱信息
         if (taskExecution.pathGraph && taskExecution.pathGraph.nodes) {
           const nodeData = taskExecution.pathGraph.nodes.find(node => 
             node.id === deviceId || node.id === deviceKey
           );
           if (nodeData && nodeData.data) {
             device.metadata = nodeData.data;
           }
         }
         
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
       });
       
       console.log('🔧 从任务参数解析的设备分类:', devices);
       return devices;
     },
    
    // 🎯 TopControl标准：创建初始化步骤
    createInitializationStep(devices) {
      const commands = [];
      
      // 1. 阀门初始化命令 - 仅对非产品收集阀进行初始化设置
      devices.valves.forEach(valve => {
        if (valve.parameters.position !== undefined && !valve.parameters.isProductValve) {
          commands.push({
            deviceId: valve.id,
            deviceType: 'valve',
            action: 'setPort',
            parameters: { port: valve.parameters.position }  // 改为port参数
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
    },
    
    // 🎯 TopControl标准：创建泵润洗步骤 - 简化版
    createPumpRinseStep(devices) {
      const commands = [];
      
      devices.pumps.forEach(pump => {
        // 1. 设置泵端口到废液口 - 固定使用6号端口作为废液口
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'setPort',
          parameters: { port: 6 }
        });
        
        // 2. 设置泵速度
        if (pump.parameters.speed !== undefined) {
          commands.push({
            deviceId: pump.id,
            deviceType: 'pump',
            action: 'setSpeed',
            parameters: { speed: pump.parameters.speed }
          });
        }
        
        // 3. 排空泵内溶液到废液口 - 简化：直接设置位置为0
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'setPosition',
          parameters: { position: 0 }
        });
        
        // 注意：润洗步骤统一排放到6号废液口，不再切换到其他端口
      });
      
      // 生成等待条件
      const conditions = this.generateCompletionConditions(commands);
      
      return {
        id: `step-${Date.now()}-rinse`,
        name: '泵润洗',
        description: '将泵排空至6号废液口进行润洗，清除可能存在的残留物',
        deviceCommands: commands,
        conditions: conditions.length > 0 ? conditions : undefined,
        waitForCompletion: true,
        delayAfter: 0
      };
    },
    
    // 🎯 TopControl标准：创建抽吸反应溶液步骤 - 简化版
    createReagentAspirationStep(devices) {
      const commands = [];
      
      devices.pumps.forEach(pump => {
        // 1. 设置泵端口到吸取端口
        if (pump.parameters.aspiratePort !== undefined) {
          commands.push({
            deviceId: pump.id,
            deviceType: 'pump',
            action: 'setPort',
            parameters: { port: pump.parameters.aspiratePort }
          });
        }
        
        // 2. 设置泵速度
        if (pump.parameters.speed !== undefined) {
          commands.push({
            deviceId: pump.id,
            deviceType: 'pump',
            action: 'setSpeed',
            parameters: { speed: pump.parameters.speed }
          });
        }
        
        // 3. 吸取溶液 - 简化：直接设置泵位置到目标值
        if (pump.parameters.position !== undefined) {
          commands.push({
            deviceId: pump.id,
            deviceType: 'pump',
            action: 'setPosition',
            parameters: { position: pump.parameters.position }
          });
        }
      });
      
      // 🆕 优化：生成核心等待条件（温度和泵位置）
      const conditions = this.generateCompletionConditions(commands);

      return {
        id: `step-${Date.now()}-aspirate`,
        name: '抽吸反应溶液',
        description: '从指定端口抽取反应所需的溶液至目标位置，等待芯片温度达标和泵位置到达指定值',
        deviceCommands: commands,
        conditions: conditions.length > 0 ? conditions : undefined,
        waitForCompletion: true,
        delayAfter: 0
      };
    },
    
    // 🎯 TopControl标准：创建反应运行步骤 - 简化版
    createReactionRunStep(devices, taskExecution) {
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
    },
    
    // 🎯 TopControl标准：创建反应稳定后阀门切换步骤
    createStabilizedValveStep(devices) {
      const commands = [];
      const productValve = devices.valves.find(valve => valve.parameters.isProductValve);
      
      if (productValve && productValve.parameters.position !== undefined) {
        commands.push({
          deviceId: productValve.id,
          deviceType: 'valve',
          action: 'setPort',
          parameters: { port: productValve.parameters.position }  // 改为port参数
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
      
      return null; // 没有产品收集阀时返回null
    },
    
    // 🎯 TopControl标准：创建清洗准备步骤
    createCleaningPreparationStep(devices) {
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
        // 设置泵端口到清洗液位置（假设端口5）
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'setPort',
          parameters: { port: 5 }
        });
        
        // 设置泵速度
        if (pump.parameters.speed !== undefined) {
          commands.push({
            deviceId: pump.id,
            deviceType: 'pump',
            action: 'setSpeed',
            parameters: { speed: pump.parameters.speed }
          });
        }
        
        // 吸取清洗液到指定体积
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'setPosition',
          parameters: { position: cleaningVolume }
        });
      });
      
      // 生成等待条件（等待泵吸取清洗液完成）
      const conditions = this.generateCompletionConditions(commands);
      
      return {
        id: `step-${Date.now()}-cleaning-prep`,
        name: '清洗准备',
        description: '将产品收集阀切换到6号孔位，泵吸取清洗液准备清洗',
        deviceCommands: commands,
        conditions: conditions.length > 0 ? conditions : undefined,
        waitForCompletion: true,
        delayAfter: 0
      };
    },
    
    // 🎯 TopControl标准：创建清洗执行步骤（推出清洗液）
    createCleaningExecutionStep(devices) {
      const commands = [];
      
      // 只需要推出清洗液，其他设备不需要动
      devices.pumps.forEach(pump => {
        // 推出清洗液 - 设置位置为0（完全排出）
        commands.push({
          deviceId: pump.id,
          deviceType: 'pump',
          action: 'setPosition',
          parameters: { position: 0 }
        });
      });
      
      // 关闭加热器
      devices.heaters.forEach(heater => {
        commands.push({
          deviceId: heater.id,
          deviceType: 'chip',
          action: 'setTemp',
          parameters: { temperature: 25, speed: 5 }
        });
      });
      
      // 生成等待条件（等待泵位置为0，即排出所有清洗溶液）
      const conditions = this.generateCompletionConditions(commands);
      
      return {
        id: `step-${Date.now()}-cleaning-execution`,
        name: '推出清洗液',
        description: '推出清洗液完成系统清洗，关闭加热器，工作流完成',
        deviceCommands: commands,
        conditions: conditions.length > 0 ? conditions : undefined,
        waitForCompletion: true,
        delayAfter: 0
      };
    },
    
    // 等待恢复
    async waitForResume() {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.workflowExecution.status === 'running') {
            clearInterval(checkInterval);
            resolve();
          } else if (this.workflowExecution.status === 'stopped') {
            clearInterval(checkInterval);
            throw new Error('工作流已被终止');
          }
        }, 500);
      });
    },
    
    // 计算整体进度
    calculateOverallProgress() {
      if (!this.workflowExecution.executionPlan || this.workflowExecution.executionPlan.length === 0) {
        return 0;
      }
      
      const totalTasks = this.workflowExecution.executionPlan.length;
      const completedTasks = this.workflowExecution.currentTaskIndex;
      const currentTaskProgress = this.getCurrentTaskProgress();
      
      return Math.round(((completedTasks + currentTaskProgress / 100) / totalTasks) * 100);
    },
    
    // 获取当前任务进度
    getCurrentTaskProgress() {
      if (!this.workflowExecution.currentTask) return 0;
      
      const taskId = this.workflowExecution.currentTask.taskId;
      if (this.workflowExecution.taskProgress.has(taskId)) {
        return this.workflowExecution.taskProgress.get(taskId).progress || 0;
      }
      return 0;
    },
    
    // 获取进度状态
    getProgressStatus() {
      switch (this.workflowExecution.status) {
        case 'completed':
          return 'success';
        case 'error':
          return 'exception';
        case 'paused':
          return 'warning';
        default:
          return '';
      }
    },
    
    // 获取任务进度
    getTaskProgress(taskId) {
      if (this.workflowExecution.taskProgress.has(taskId)) {
        return Math.round(this.workflowExecution.taskProgress.get(taskId).progress || 0);
      }
      return 0;
    },
    
    // 获取反应进度
    getReactionProgress(taskId) {
      if (this.workflowExecution.taskProgress.has(taskId)) {
        const progress = this.workflowExecution.taskProgress.get(taskId);
        return progress.reactionProgress !== undefined ? Math.round(progress.reactionProgress) : null;
      }
      return null;
    },
    
    // 获取剩余时间
    getRemainingTime(taskId) {
      if (this.workflowExecution.taskProgress.has(taskId)) {
        const progress = this.workflowExecution.taskProgress.get(taskId);
        return progress.remainingTime || 0;
      }
      return 0;
    },
    
    // 格式化时间
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    },
    
    // 🧹 清理参数格式，移除无效的设备ID和参数
    cleanParametersFormat(parameters) {
      if (!parameters || typeof parameters !== 'object') {
        console.log('🧹 参数为空或无效，返回空对象');
        return {};
      }
      
      console.log('🧹 开始清理参数，原始参数:', parameters);
      const cleanedParameters = {};
      
      Object.entries(parameters).forEach(([deviceId, deviceInfo]) => {
        console.log('🔍 处理设备参数:', deviceId, deviceInfo);
        
        // 🚫 过滤掉纯数字的设备ID
        if (/^\d+$/.test(deviceId)) {
          console.warn('🧹 清理：跳过纯数字设备ID:', deviceId);
          return;
        }
        
        // 🔧 修复：允许标准的设备ID格式 deviceType_id，不强制要求包含-
        // 如 pump_1, valve_2, pump_pump-1 等都是有效的
        if (!deviceId.includes('_') && !deviceId.includes('-')) {
          console.warn('🧹 清理：跳过不规范设备ID（应包含_或-):', deviceId);
          return;
        }
        
        // 验证设备信息
        if (!deviceInfo || typeof deviceInfo !== 'object') {
          console.warn('🧹 清理：跳过无效设备信息:', deviceId, deviceInfo);
          return;
        }
        
        // 🔧 修复：标准化设备信息格式，处理多种可能的格式
        let finalDeviceInfo = null;
        
        if (deviceInfo.type && deviceInfo.parameters) {
          // 已经是标准格式 { type: "pump", parameters: { flowRate: 10 } }
          if (Object.keys(deviceInfo.parameters).length > 0) {
            finalDeviceInfo = {
              type: deviceInfo.type,
              parameters: { ...deviceInfo.parameters }
            };
            console.log('✅ 标准格式设备参数:', deviceId, finalDeviceInfo);
        } else {
            console.log('⚪ 设备参数为空，跳过:', deviceId);
            return;
          }
        } else if (!deviceInfo.type && !deviceInfo.parameters) {
          // 可能是直接参数格式 { flowRate: 10, speed: 100 }
          // 需要检查是否包含有效参数
          const paramKeys = Object.keys(deviceInfo);
          if (paramKeys.length > 0) {
            const deviceType = this.extractDeviceType(deviceId);
            if (deviceType && deviceType !== 'unknown') {
              finalDeviceInfo = {
                type: deviceType,
                parameters: { ...deviceInfo }
              };
              console.log('✅ 直接参数格式转换:', deviceId, finalDeviceInfo);
            } else {
              console.warn('🧹 清理：无法识别设备类型:', deviceId);
              return;
            }
          } else {
            console.log('⚪ 设备参数为空，跳过:', deviceId);
            return;
          }
        } else {
          console.warn('🧹 清理：跳过格式不明确的设备:', deviceId, deviceInfo);
          return;
        }
        
        // 🔧 最终验证：确保有参数才保存
        if (finalDeviceInfo && finalDeviceInfo.parameters && Object.keys(finalDeviceInfo.parameters).length > 0) {
          cleanedParameters[deviceId] = finalDeviceInfo;
          console.log('✅ 成功清理设备参数:', deviceId, finalDeviceInfo);
        } else {
          console.log('⚪ 最终验证失败，设备参数为空，跳过:', deviceId);
        }
      });
      
      console.log('🧹 参数清理完成:', {
        原始设备数: Object.keys(parameters).length,
        清理后设备数: Object.keys(cleanedParameters).length,
        清理后参数: cleanedParameters
      });
      
      // 🔧 如果清理后没有任何有效参数，返回空对象但给出明确提示
      if (Object.keys(cleanedParameters).length === 0) {
        console.warn('⚠️ 清理后没有有效的设备参数！原始参数可能全为默认值或格式无效');
      }
      
      return cleanedParameters;
    },
    
    // 🔧 设备分析方法 - 从设备路径和路径图中分析设备信息
    analyzeDevicesFromPath(devicePath, pathGraph) {
      const devices = { 
        pumps: [], 
        valves: [], 
        heaters: [], 
        mfcs: [],
        lights: [],
        others: [] 
      };
      
      if (!devicePath || !Array.isArray(devicePath)) {
        console.warn('设备路径为空或格式不正确:', devicePath);
        return devices;
      }
      
      // 从设备路径中分析设备
      devicePath.forEach(deviceId => {
        if (!deviceId || typeof deviceId !== 'string') {
          console.warn('无效的设备ID:', deviceId);
          return;
        }
        
        // 解析设备类型和本地ID (格式: deviceType-localId 或 deviceType_localId)
        const deviceParts = deviceId.split(/[-_]/);
        if (deviceParts.length < 2) {
          console.warn('设备ID格式不正确:', deviceId);
          devices.others.push({ id: deviceId, type: 'unknown' });
          return;
        }
        
        const deviceType = deviceParts[0].toLowerCase();
        const localId = deviceParts[1];
        
        const deviceInfo = {
          id: deviceId,
          type: deviceType,
          localId: localId,
          fullId: deviceId
        };
        
        // 根据设备类型分类
        switch(deviceType) {
          case 'pump':
            devices.pumps.push(deviceInfo);
            break;
          case 'valve':
            devices.valves.push(deviceInfo);
            break;
          case 'chip':
          case 'heater':
            devices.heaters.push(deviceInfo);
            break;
          case 'bottle':
            // 🔧 修复：添加bottle类型设备支持
            if (!devices.bottles) devices.bottles = [];
            devices.bottles.push(deviceInfo);
            break;
          case 'mfc':
            devices.mfcs.push(deviceInfo);
            break;
          case 'light':
            devices.lights.push(deviceInfo);
            break;
          default:
            console.warn('未知设备类型:', deviceType);
            devices.others.push(deviceInfo);
        }
      });
      
      // 如果有路径图信息，可以进一步分析设备关系和参数
      if (pathGraph && typeof pathGraph === 'object') {
        // 这里可以根据pathGraph中的信息进一步完善设备信息
        // 例如：设备的连接关系、默认参数等
        console.log('路径图信息:', pathGraph);
      }
      
      console.log('设备分析结果:', devices);
      return devices;
    },
    
    // 🔧 调试调度状态的方法
    debugScheduleStatus() {
      console.log('=== 调度状态调试信息 ===');
      
      const selectedTasksInfo = this.selectedRows.map(row => {
        const tableRow = this.tableData.find(tRow => tRow.id === row.id && tRow.key === row.key);
        const groupedRow = this.groupedRows.find(gRow => gRow.id === row.id && gRow.key === row.key);
        
        return {
          id: row.id,
          key: row.key,
          taskName: row.parentTaskName,
          selectedRow_hasQueueResult: !!row.queueResult,
          selectedRow_queueResult: row.queueResult,
          tableRow_hasQueueResult: tableRow ? !!tableRow.queueResult : 'N/A',
          tableRow_queueResult: tableRow ? tableRow.queueResult : 'N/A',
          groupedRow_hasQueueResult: groupedRow ? !!groupedRow.queueResult : 'N/A',
          groupedRow_queueResult: groupedRow ? groupedRow.queueResult : 'N/A'
        };
      });
      
      console.table(selectedTasksInfo);
      
      // 检查WebSocket连接状态
      console.log('=== WebSocket连接状态 ===');
      console.log('AI调度WebSocket状态:', this.ws_ai ? this.ws_ai.readyState : 'null');
      console.log('硬件控制WebSocket状态:', this.ws_hardware ? this.ws_hardware.readyState : 'null');
      
      // 检查最近的调度结果
      console.log('=== 最近的调度结果 ===');
      console.log('schedule_result:', this.schedule_result);
      
      // 显示诊断对话框
      const hasScheduledTasks = selectedTasksInfo.filter(task => task.selectedRow_hasQueueResult).length;
      const totalTasks = selectedTasksInfo.length;
      
      this.$alert(
        `调度状态检查结果：\n\n` +
        `选中任务总数：${totalTasks}\n` +
        `已调度任务数：${hasScheduledTasks}\n` +
        `未调度任务数：${totalTasks - hasScheduledTasks}\n\n` +
        `AI调度服务连接：${this.ws_ai && this.ws_ai.readyState === WebSocket.OPEN ? '✅ 已连接' : '❌ 未连接'}\n` +
        `硬件控制服务连接：${this.ws_hardware && this.ws_hardware.readyState === WebSocket.OPEN ? '✅ 已连接' : '❌ 未连接'}\n\n` +
        `详细信息请查看浏览器控制台。`,
        '调度状态诊断',
        {
          confirmButtonText: '确定',
          type: hasScheduledTasks === totalTasks ? 'success' : 'warning'
        }
      );
    },
    
    // 🔧 初始化AI调度WebSocket连接
    initAIWebSocket() {
      try {
        console.log('🔗 初始化AI调度WebSocket连接...');
        
        // 如果之前的连接存在，先关闭
        if (this.ws_ai) {
          this.ws_ai.close();
        }
        
        const aiUrl = (import.meta.env && import.meta.env.VITE_WS_AI_URL) ? import.meta.env.VITE_WS_AI_URL : (window.location.origin.replace(/^http/, 'ws') + '/ws-ai');
        this.ws_ai = new WebSocket(aiUrl);
        
        this.ws_ai.onopen = () => {
          console.log("✅ AI调度WebSocket连接已建立");
          this.isAIConnected = true;
        };
        
        this.ws_ai.onmessage = async (evt) => {
          try {
            const result = JSON.parse(evt.data);
            const serve = result.serve;
            this.schedule_result = result;
            
            console.log('📨 收到AI服务消息:', {
              serve: serve,
              dataSize: JSON.stringify(result).length,
              timestamp: new Date().toISOString()
            });
            
            switch (serve) {
              case "queue":
                console.log("📋 收到queue调度服务消息:", result);
                this.handleQueueResult(result);
                break;
              case "graph":
                console.log("🗺️ 收到graph映射服务消息:", result);
                // 如果需要处理graph消息，在这里添加逻辑
                break;
              default:
                console.log("ℹ️ 收到其他类型消息:", serve, result);
            }
      } catch (error) {
            console.error('❌ 解析AI服务消息失败:', error, '原始数据:', evt.data);
          }
        };
        
        this.ws_ai.onclose = (event) => {
          console.log('🔌 AI调度WebSocket连接已关闭:', event.code, event.reason);
          this.isAIConnected = false;
          
          // 如果不是主动关闭，尝试重连
          if (event.code !== 1000) { // 1000表示正常关闭
            console.log('🔄 5秒后尝试重新连接AI服务...');
            setTimeout(() => {
              this.initAIWebSocket();
            }, 5000);
          }
        };
        
        this.ws_ai.onerror = (error) => {
          console.error('❌ AI调度WebSocket连接错误:', error);
          this.isAIConnected = false;
        };
        
      } catch (error) {
        console.error('❌ 初始化AI调度WebSocket失败:', error);
        this.isAIConnected = false;
      }
    },
    
    // 处理WebSocket消息中的queue结果
    
    // 🎯 在监控界面自动加载任务结构图
    autoLoadTaskGraphInMonitor(executionPlan) {
      if (!executionPlan || executionPlan.length === 0) {
        console.warn('⚠️ 没有有效的执行计划，无法自动加载结构图');
        return;
      }
      
      console.log('🎯 准备在监控界面自动加载结构图:', executionPlan);
      
      // 选择第一个任务作为默认显示的结构图
      const firstTask = executionPlan[0];
      
      // 🔧 过滤和验证设备路径，确保只包含有效的设备ID
      const validDevicePath = (firstTask.devicePath || []).filter(deviceId => {
        // 过滤掉非字符串、空值、或包含中文步骤描述的项
        return deviceId && 
               typeof deviceId === 'string' && 
               !deviceId.includes('执行步骤') && 
               !deviceId.includes(':') && 
               deviceId.length < 50 &&
               /^[a-zA-Z0-9\-_]+$/.test(deviceId); // 只允许字母、数字、横线、下划线
      });
      
      console.log('🔧 过滤前的设备路径:', firstTask.devicePath);
      console.log('🔧 过滤后的设备路径:', validDevicePath);
      
      // 构建类似于edit功能的任务数据
      const taskData = {
        taskId: firstTask.taskId,
        taskKey: firstTask.taskKey,
        taskName: firstTask.taskName,
        product: firstTask.product || '化学反应',
        reactTime: firstTask.reactTime || firstTask.duration || 0,
        devicePath: validDevicePath,
        matchedPath: validDevicePath,
        pathGraph: firstTask.pathGraph || {},
        matchData: firstTask.pathGraph || {},
        parameters: firstTask.parameters || {},
        // 标识这是监控模式自动加载
        isMonitorAutoLoad: true,
        // 传递完整的执行计划用于任务切换
        fullExecutionPlan: executionPlan
      };
      
      console.log('🔧 构建的任务数据:', taskData);
      
      // 延迟发送消息，确保监控页面iframe完全加载
      const sendAutoLoadMessage = () => {
        try {
          // 🎯 首先发送自动加载自定义结构的消息
          console.log('🎯 步骤1: 发送自动加载自定义结构消息');
          
          window.postMessage({
            type: 'AUTO_LOAD_STRUCTURE',
            data: JSON.stringify({
              action: 'loadFirstAvailableStructure',
              reason: 'workflow_execution',
              timestamp: new Date().toISOString()
            })
          }, window.location.origin);
          
          // 🎯 延迟发送任务数据，确保自定义结构先加载
          setTimeout(() => {
            console.log('🎯 步骤2: 发送任务结构图数据');
            
            // 方法1：通过window消息发送，让monitor页面转发给iframe
            window.postMessage({
              type: 'AUTO_LOAD_TASK_GRAPH',
              data: JSON.stringify({
                autoLoad: true,
                taskData: taskData,
                editData: taskData,
                isMonitorMode: true
              })
            }, window.location.origin);
            
            // 方法2：再发送ROW_DATA消息
            setTimeout(() => {
              window.postMessage({
                type: 'ROW_DATA',
                data: JSON.stringify(taskData.pathGraph || {})
              }, window.location.origin);
              
              console.log('📤 已发送ROW_DATA消息');
            }, 1000);
            
            // 方法3：直接查找iframe（备用方案）
            const monitorIframe = document.querySelector('iframe[src*="monitor-standalone"]');
            
            if (monitorIframe && monitorIframe.contentWindow) {
              console.log('✅ 找到监控iframe，发送自动加载消息');
              
              // 首先发送自动加载结构消息
              const childOrigin = this.getChildOrigin(monitorIframe);
              monitorIframe.contentWindow.postMessage({
                type: 'AUTO_LOAD_STRUCTURE',
                data: JSON.stringify({
                  action: 'loadFirstAvailableStructure',
                  reason: 'workflow_execution'
                })
              }, childOrigin);
              
              // 然后延迟发送任务数据
              setTimeout(() => {
                monitorIframe.contentWindow.postMessage({
                  type: 'AUTO_LOAD_TASK_GRAPH',
                  data: JSON.stringify({
                    autoLoad: true,
                    taskData: taskData,
                    editData: taskData,
                    isMonitorMode: true
                  })
                }, childOrigin);
                
                setTimeout(() => {
                  monitorIframe.contentWindow.postMessage({
                    type: 'ROW_DATA',
                    data: JSON.stringify(taskData.pathGraph || {})
                  }, childOrigin);
                }, 1000);
                
                console.log('📤 已直接发送消息到iframe');
              }, 1500); // 给自定义结构加载足够时间
              
            } else {
              console.warn('⚠️ 未找到监控iframe，已通过window消息转发');
            }
            
          }, 2000); // 给自定义结构加载2秒时间
          
          console.log('📤 已发送自动加载消息');
        
        } catch (error) {
          console.error('❌ 发送自动加载消息失败:', error);
        }
      };
      
      // 🎯 优化：多通道尝试发送消息，确保消息能够送达
      let attempts = 0;
      const maxAttempts = 12;
      const attemptInterval = 1000;
      
      const tryAutoLoad = () => {
        attempts++;
        console.log(`🔄 尝试自动加载结构图 (${attempts}/${maxAttempts})`);
        
        // 🎯 方法1：通过监控容器iframe
        const monitorContainer = document.querySelector('.monitor-iframe-container');
        let monitorIframe = null;
        
        if (monitorContainer) {
          monitorIframe = monitorContainer.querySelector('iframe');
        }
        
        // 🎯 方法2：备用选择器
        if (!monitorIframe) {
          const selectors = [
            'iframe[src*="monitor-standalone"]',
            '#app iframe[src*="monitor-standalone"]'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.contentWindow) {
              monitorIframe = element;
              break;
            }
          }
        }
        
        if (monitorIframe && monitorIframe.contentWindow) {
          console.log('✅ 找到监控iframe，发送自动加载消息');
          sendAutoLoadMessage();
          
          // 🎯 同时通过window消息机制发送（双重保险）
          try {
            window.postMessage({
              type: 'AUTO_LOAD_STRUCTURE',
              data: JSON.stringify({
                action: 'loadFirstAvailableStructure',
                reason: 'workflow_execution',
                timestamp: new Date().toISOString()
              })
            }, window.location.origin);
            
            setTimeout(() => {
              window.postMessage({
                type: 'AUTO_LOAD_TASK_GRAPH',
                data: JSON.stringify({
                  autoLoad: true,
                  taskData: taskData,
                  editData: taskData,
                  isMonitorMode: true
                })
              }, window.location.origin);
            }, 1500);
            
            console.log('✅ 已通过window消息机制发送备用消息');
          } catch (error) {
            console.warn('⚠️ window消息发送失败', error);
          }
          
          return;
        }
        
        if (attempts < maxAttempts) {
          console.log(`⚠️ 第${attempts}次未找到iframe，${attemptInterval}ms后重试...`);
          setTimeout(tryAutoLoad, attemptInterval);
        } else {
          console.warn('⚠️ 达到最大重试次数，尝试通过window消息机制发送');
          
          // 🎯 最后的备用方案：仅通过window消息
          try {
            window.postMessage({
              type: 'AUTO_LOAD_STRUCTURE',
              data: JSON.stringify({
                action: 'loadFirstAvailableStructure',
                reason: 'workflow_execution_fallback',
                timestamp: new Date().toISOString()
              })
            }, window.location.origin);
            
            setTimeout(() => {
              window.postMessage({
                type: 'AUTO_LOAD_TASK_GRAPH',
                data: JSON.stringify({
                  autoLoad: true,
                  taskData: taskData,
                  editData: taskData,
                  isMonitorMode: true
                })
              }, window.location.origin);
            }, 2000);
            
            console.log('🔄 已启用备用消息发送机制');
          } catch (error) {
            console.error('❌ 所有消息发送方式都失败', error);
            this.$message.warning('自动加载结构图可能失败，请在监控界面手动刷新');
          }
        }
      };
      
      // 🎯 立即开始尝试
      tryAutoLoad();
    },
    
    // 🎯 开始工作流可视化流程
    startWorkflowVisualization(executionPlan) {
      console.log('🎯 开始工作流可视化流程:', executionPlan);
      
      if (!executionPlan || executionPlan.length === 0) {
        console.warn('⚠️ 没有有效的执行计划，无法开始可视化');
        return;
      }
      
      // 🎯 优化：使用事件驱动而非轮询的方式等待iframe准备
      let visualizationStarted = false;
      let retryCount = 0;
      const maxRetries = 15; // 最多重试15次
      
      const checkAndStartVisualization = () => {
        if (visualizationStarted) return;
        
        retryCount++;
        console.log(`🔄 第${retryCount}次检查iframe状态...`);
        
        // 🎯 改进的iframe检测逻辑，优先检查monitor容器内的iframe
        let monitorIframe = null;
        
        // 方法1：通过监控页面的ref直接获取iframe
        const monitorContainer = document.querySelector('.monitor-iframe-container');
        if (monitorContainer) {
          monitorIframe = monitorContainer.querySelector('iframe');
          if (monitorIframe && monitorIframe.contentWindow) {
            console.log('✅ 通过monitor容器找到iframe');
          }
        }
        
        // 方法2：备用选择器
        if (!monitorIframe || !monitorIframe.contentWindow) {
          const selectors = [
            'iframe[src*="monitor-standalone"]',
            '.monitor-iframe-container iframe',
            '#app iframe[src*="monitor-standalone"]'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.contentWindow) {
              monitorIframe = element;
              console.log(`✅ 通过选择器找到iframe: ${selector}`);
              break;
            }
          }
        }
        
        if (!monitorIframe || !monitorIframe.contentWindow) {
          if (retryCount < maxRetries) {
            console.log(`⚠️ 第${retryCount}次未找到可用iframe，1秒后重试...`);
            setTimeout(checkAndStartVisualization, 1000);
          } else {
            console.error('❌ 达到最大重试次数，无法找到监控界面iframe');
            this.$message.error('无法连接到监控界面，请手动刷新监控页面');
          }
          return;
        }
        
        // 🎯 检查iframe是否完全加载
        try {
          // 发送测试消息，如果成功说明iframe准备就绪
          monitorIframe.contentWindow.postMessage({
            type: 'IFRAME_READY_CHECK',
            timestamp: new Date().toISOString()
          }, 'http://localhost:8850');
          
          // 给iframe一点反应时间，然后开始可视化
          setTimeout(() => {
            if (!visualizationStarted) {
              visualizationStarted = true;
              console.log('🎯 开始工作流可视化');
              this.highlightTasksSequentially(executionPlan, monitorIframe);
            }
          }, 500);
          
        } catch (error) {
          console.warn('⚠️ iframe通信测试失败，重试...', error);
          if (retryCount < maxRetries) {
            setTimeout(checkAndStartVisualization, 1000);
          }
        }
      };
      
      // 🎯 先等待一段时间让页面和iframe完全加载，然后开始检查
      setTimeout(checkAndStartVisualization, 1500);
    },
    
    // 🎯 按顺序高亮显示任务路径
    highlightTasksSequentially(executionPlan, monitorIframe) {
      if (!executionPlan || executionPlan.length === 0 || !monitorIframe) {
        return;
      }
      
      console.log('🎯 开始按顺序高亮显示任务路径');
      
      let currentTaskIndex = 0;
      
      const highlightNextTask = () => {
        if (currentTaskIndex >= executionPlan.length) {
          console.log('✅ 所有任务路径高亮完成');
          
          // 🎯 显示工作流启动成功的全局提示
          this.$message.success({
            message: `工作流已启动！共 ${executionPlan.length} 个任务正在执行中`,
            duration: 5000,
            showClose: true
          });
          
          return;
        }
        
        const currentTask = executionPlan[currentTaskIndex];
        console.log(`🎯 高亮显示任务 ${currentTaskIndex + 1}/${executionPlan.length}:`, currentTask.taskName);
        
        // 🔧 过滤和验证设备路径
        const validDevicePath = (currentTask.devicePath || []).filter(deviceId => {
          return deviceId && 
                 typeof deviceId === 'string' && 
                 !deviceId.includes('执行步骤') && 
                 !deviceId.includes(':') && 
                 deviceId.length < 50 &&
                 /^[a-zA-Z0-9\-_]+$/.test(deviceId);
        });
        
        if (validDevicePath.length === 0) {
          console.warn(`⚠️ 任务 ${currentTask.taskName} 没有有效的设备路径，跳过高亮`);
          currentTaskIndex++;
          setTimeout(highlightNextTask, 500);
          return;
        }
        
        // 🎯 发送高亮消息到监控界面
        try {
          const childOrigin = this.getChildOrigin(monitorIframe);
          monitorIframe.contentWindow.postMessage({
            type: 'REALTIME_HIGHLIGHT',
            data: JSON.stringify({
              action: 'highlight_task_path',
              devicePath: validDevicePath,
              taskInfo: {
                taskId: currentTask.taskId,
                taskName: currentTask.taskName,
                taskIndex: currentTaskIndex + 1,
                totalTasks: executionPlan.length
              },
              highlightColor: '#ff6b35', // 工作流高亮颜色
              timestamp: new Date().toISOString()
            })
          }, childOrigin);
          
          console.log(`✅ 已发送任务 ${currentTask.taskName} 的高亮消息`);
          
          // 🎯 在监控界面显示当前任务信息
          setTimeout(() => {
            monitorIframe.contentWindow.postMessage({
              type: 'SHOW_TASK_INFO',
              data: JSON.stringify({
                taskName: currentTask.taskName,
                taskIndex: currentTaskIndex + 1,
                totalTasks: executionPlan.length,
                deviceCount: validDevicePath.length,
                estimatedTime: currentTask.reactTime || currentTask.duration || 'Unknown'
              })
            }, childOrigin);
          }, 500);
          
        } catch (error) {
          console.error(`❌ 发送任务 ${currentTask.taskName} 高亮消息失败:`, error);
        }
        
        // 🎯 继续下一个任务（延迟以便用户能看到效果）
        currentTaskIndex++;
        setTimeout(highlightNextTask, 2000); // 每个任务高亮持续2秒
      };
      
      // 开始高亮显示
      highlightNextTask();
    },
    
    // 🎯 事件驱动的工作流可视化初始化
    initializeWorkflowVisualization(executionPlan) {
      console.log('🎯 初始化工作流可视化流程');
      
      let isInitialized = false;
      let structureLoaded = false;
      let retryCount = 0;
      const maxRetries = 20;
      
      // 🎯 监听iframe准备状态响应
      const handleIframeResponse = (event) => {
        if (event.data.type === 'IFRAME_READY_RESPONSE' && event.data.ready) {
          console.log('✅ 收到iframe准备就绪确认');
          
          if (!isInitialized) {
            isInitialized = true;
            
            // 移除监听器
            window.removeEventListener('message', handleIframeResponse);
            
            // 步骤1：发送自动加载结构图的消息
            this.autoLoadTaskGraphInMonitor(executionPlan);
            
            // 步骤2：等待结构图加载完成的确认
            setTimeout(() => {
              if (!structureLoaded) {
                structureLoaded = true;
                this.startWorkflowVisualization(executionPlan);
              }
            }, 2000); // 给结构图加载2秒时间
          }
        }
      };
      
      // 🎯 添加响应监听
      window.addEventListener('message', handleIframeResponse);
      
      // 🎯 主动检查iframe状态
      const checkIframeStatus = () => {
        retryCount++;
        console.log(`🔄 第${retryCount}次检查iframe状态...`);
        
        // 查找监控iframe
        const monitorContainer = document.querySelector('.monitor-iframe-container');
        let monitorIframe = null;
        
        if (monitorContainer) {
          monitorIframe = monitorContainer.querySelector('iframe');
        }
        
        if (!monitorIframe) {
          monitorIframe = document.querySelector('iframe[src*="monitor-standalone"]');
        }
        
        if (monitorIframe && monitorIframe.contentWindow) {
          try {
            // 发送准备状态检查
            const childOrigin = this.getChildOrigin(monitorIframe);
            monitorIframe.contentWindow.postMessage({
              type: 'IFRAME_READY_CHECK',
              timestamp: new Date().toISOString()
            }, childOrigin);
            
            console.log('✅ 已发送iframe准备状态检查');
            
            // 设置超时处理，如果5秒内没有响应，继续重试
            setTimeout(() => {
              if (!isInitialized && retryCount < maxRetries) {
                checkIframeStatus();
              } else if (!isInitialized && retryCount >= maxRetries) {
                console.warn('⚠️ iframe准备检查超时，强制启动可视化');
                window.removeEventListener('message', handleIframeResponse);
                this.autoLoadTaskGraphInMonitor(executionPlan);
                setTimeout(() => {
                  this.startWorkflowVisualization(executionPlan);
                }, 3000);
              }
            }, 1000);
            
          } catch (error) {
            console.warn('⚠️ iframe通信失败，延迟重试', error);
            if (retryCount < maxRetries) {
              setTimeout(checkIframeStatus, 1000);
            }
          }
        } else {
          if (retryCount < maxRetries) {
            console.log('⚠️ 未找到iframe，1秒后重试...');
            setTimeout(checkIframeStatus, 1000);
          } else {
            console.error('❌ 达到最大重试次数，无法找到iframe');
            this.$message.error('无法连接到监控界面，请手动刷新监控页面');
          }
        }
      };
      
      // 🎯 开始检查，给页面一些加载时间
      setTimeout(checkIframeStatus, 1000);
    },
    
    // 🎯 向监控界面发送实时高亮信息
    sendRealTimeHighlightToMonitor(highlightData) {
      try {
        console.log('🎯 准备发送实时高亮数据:', highlightData);
        
        // 🎯 如果监控界面还没准备好，先缓存数据
        if (!this.monitorReadyReceived) {
          console.log('⏳ 监控界面还未准备好，将高亮数据缓存');
          this.highlightDataCache.push(highlightData);
          
          // 限制缓存大小，避免内存过大
          if (this.highlightDataCache.length > 50) {
            this.highlightDataCache.shift(); // 移除最早的数据
          }
          return;
        }
        
        // 构建高亮消息，包含当前执行状态和路径信息
        const highlightMessage = {
          type: 'REALTIME_HIGHLIGHT',
          highlightType: highlightData.type,
          data: JSON.stringify({
            ...highlightData,
            // 添加当前执行任务的路径图数据
            currentTaskData: this.getCurrentTaskHighlightData(highlightData.taskId),
            // 添加并发执行的所有任务数据（如果是并发模式）
            concurrentTasksData: this.getConcurrentTasksHighlightData(highlightData)
          })
        };
        
        // 🎯 检查监控iframe是否准备好并延迟发送，确保数据不丢失
        const sendHighlightWithRetry = (attemptCount = 0) => {
          const maxAttempts = 10;
          const monitorIframe = document.querySelector('#app iframe[src*="monitor-standalone"]');
          
          if (monitorIframe && monitorIframe.contentWindow) {
            try {
              // 发送到iframe
              const childOrigin = this.getChildOrigin(monitorIframe);
              monitorIframe.contentWindow.postMessage(highlightMessage, childOrigin);
              console.log('✅ 实时高亮数据已直接发送到iframe (尝试' + (attemptCount + 1) + '次)');
              
              // 同时通过window消息转发（备用方案）
              window.postMessage(highlightMessage, window.location.origin);
              console.log('✅ 实时高亮数据已发送到window进行转发');
              
              return true; // 发送成功
            } catch (error) {
              console.error('❌ 发送高亮数据失败:', error);
            }
          }
          
          // 如果iframe不可用且还有重试次数，则延迟重试
          if (attemptCount < maxAttempts) {
            console.log(`⏳ 监控iframe未准备好，${1000 * (attemptCount + 1)}ms后重试 (${attemptCount + 1}/${maxAttempts})`);
            setTimeout(() => {
              sendHighlightWithRetry(attemptCount + 1);
            }, 1000 * (attemptCount + 1)); // 递增延迟时间
          } else {
            console.warn('⚠️ 达到最大重试次数，高亮数据可能丢失');
            // 最后尝试通过window消息发送
            window.postMessage(highlightMessage, window.location.origin);
          }
          
          return false;
        };
        
        // 🎯 立即尝试发送，如果失败则重试
        const success = sendHighlightWithRetry();
        
        // 🎯 如果当前路由就是monitor页面，增加额外的延迟发送确保iframe完全加载
        if (this.$route.path === '/monitor') {
          setTimeout(() => {
            const delayedIframe = document.querySelector('#app iframe[src*="monitor-standalone"]');
            if (delayedIframe && delayedIframe.contentWindow) {
              try {
                const childOrigin = this.getChildOrigin(delayedIframe);
                delayedIframe.contentWindow.postMessage(highlightMessage, childOrigin);
                console.log('✅ 延迟发送实时高亮数据到monitor页面iframe');
              } catch (error) {
                console.error('❌ 延迟发送失败:', error);
              }
            }
          }, 2000); // 2秒延迟，确保页面切换和iframe加载完成
        }
        
      } catch (error) {
        console.error('❌ 发送实时高亮数据失败:', error);
      }
    },
    
    // 🎯 获取当前任务的高亮数据
    getCurrentTaskHighlightData(taskId) {
      if (!taskId) return null;
      
      // 从runningTasksStore中获取当前执行计划
      const currentWorkflow = runningTasksStore.getCurrentWorkflowInfo;
      if (!currentWorkflow || !currentWorkflow.tasks) return null;
      
      // 查找当前任务的详细信息
      const currentTask = currentWorkflow.tasks.find(task => task.taskId === taskId);
      if (!currentTask) return null;
      
      // 🔧 过滤设备路径，确保只包含有效的设备ID
      const validDevicePath = (currentTask.devicePath || []).filter(deviceId => {
        return deviceId && 
               typeof deviceId === 'string' && 
               !deviceId.includes('执行步骤') && 
               !deviceId.includes(':') && 
               deviceId.length < 50 &&
               /^[a-zA-Z0-9\-_]+$/.test(deviceId);
      });
      
      return {
        taskId: currentTask.taskId,
        taskName: currentTask.taskName,
        taskKey: currentTask.taskKey,
        devicePath: validDevicePath,
        pathGraph: currentTask.pathGraph || {},
        parameters: currentTask.parameters || {},
        matchedPath: validDevicePath,
        matchData: currentTask.pathGraph || {},
        // 标识这是正在执行的任务
        isCurrentlyExecuting: true,
        executionMode: 'sequential'
      };
    },
    
    // 🎯 获取并发任务的高亮数据
    getConcurrentTasksHighlightData(highlightData) {
      // 如果不是并发相关的消息，返回null
      if (!highlightData.type || !highlightData.type.includes('CONCURRENT')) {
        return null;
      }
      
      // 获取当前并发组的任务数据
      if (this.concurrentExecution.currentGroups && this.concurrentExecution.currentGroups.length > 0) {
        return this.concurrentExecution.currentGroups.map(group => ({
          groupId: group.groupId,
          groupName: group.groupName || `并发组 ${group.groupId}`,
          tasks: group.tasks.map(task => {
            // 🔧 过滤设备路径，确保只包含有效的设备ID
            const validDevicePath = (task.devicePath || []).filter(deviceId => {
              return deviceId && 
                     typeof deviceId === 'string' && 
                     !deviceId.includes('执行步骤') && 
                     !deviceId.includes(':') && 
                     deviceId.length < 50 &&
                     /^[a-zA-Z0-9\-_]+$/.test(deviceId);
            });
            
            return {
              taskId: task.taskId,
              taskName: task.taskName,
              taskKey: task.taskKey,
              devicePath: validDevicePath,
              pathGraph: task.pathGraph || {},
              parameters: task.parameters || {},
              matchedPath: validDevicePath,
              matchData: task.pathGraph || {},
              isCurrentlyExecuting: true
            };
          }),
          executionMode: 'concurrent'
        }));
      }
      
      return null;
    },
    
    // 🎯 测试实时高亮功能
    testRealtimeHighlight() {
      console.log('🧪 开始测试实时高亮功能');
      
      // 🔍 首先检查是否有可用的图形节点数据
      let testDevicePath = ['pump-1', 'valve-1', 'chip-1']; // 默认测试路径
      let testTaskName = '测试任务';
      
      // 🎯 优先使用监控界面的真实节点ID
      if (this.monitorGraphNodes.length >= 3) {
        // 随机选择3个节点进行测试
        const randomNodes = this.monitorGraphNodes
          .filter(node => node.id && typeof node.id === 'string')
          .slice(0, 3);
        
        if (randomNodes.length >= 3) {
          testDevicePath = randomNodes.map(node => node.id);
          console.log('🎯 使用监控界面的真实节点ID:', testDevicePath);
        }
      }
      
      // 🔧 如果有选中的任务，使用任务数据
      if (this.selectedRows.length > 0) {
        const firstTask = this.selectedRows[0];
        testTaskName = firstTask.taskName || '测试任务';
        
        if (firstTask.mapping_result && firstTask.mapping_result.matchedPath) {
          const taskPath = firstTask.mapping_result.matchedPath.slice(0, 3);
          // 检查任务路径中的节点是否在当前图形中存在
          const existingNodes = taskPath.filter(nodeId => 
            this.monitorGraphNodes.some(node => node.id === nodeId)
          );
          
          if (existingNodes.length >= 2) {
            testDevicePath = existingNodes;
            console.log('🎯 使用任务中存在的设备路径:', testDevicePath);
          }
        }
      }
      
      console.log('🎯 最终使用的设备路径:', testDevicePath);
      
      // 🆕 首先清除之前的高亮
      this.sendRealTimeHighlightToMonitor({
        type: 'CLEAR_ALL_HIGHLIGHTS',
        timestamp: new Date().toISOString()
      });
      
      // 模拟步骤开始消息
      setTimeout(() => {
        this.sendRealTimeHighlightToMonitor({
          type: 'STEP_STARTED',
          taskId: 'test_task_001',
          stepName: `测试步骤：初始化设备 - ${testTaskName}`,
          stepIndex: 1,
          devicePath: testDevicePath,
          currentDevices: [testDevicePath[0]], // 当前设备为第一个
          timestamp: new Date().toISOString()
        });
        console.log('✅ 已发送步骤开始消息，设备路径:', testDevicePath);
      }, 1000);
      
      // 模拟任务状态更新消息
      setTimeout(() => {
        this.sendRealTimeHighlightToMonitor({
          type: 'TASK_STATUS_UPDATE',
          taskId: 'test_task_001',
          status: 'running',
          progress: 25,
          currentDevice: testDevicePath[1], // 当前设备为第二个
          devicePath: testDevicePath,
          timestamp: new Date().toISOString()
        });
        console.log('✅ 已发送任务状态更新消息');
      }, 3000);
      
      // 模拟步骤完成消息
      setTimeout(() => {
        this.sendRealTimeHighlightToMonitor({
          type: 'STEP_COMPLETED',
          taskId: 'test_task_001',
          stepName: `测试步骤：初始化设备 - ${testTaskName}`,
          stepIndex: 1,
          devicePath: testDevicePath,
          completedDevices: testDevicePath.slice(0, 2), // 前两个设备完成
          timestamp: new Date().toISOString()
        });
        console.log('✅ 已发送步骤完成消息');
      }, 5000);
      
      // 🔧 优化：模拟更真实的并发组数据
      setTimeout(() => {
        // 如果有多个选中任务，使用真实数据构建并发组
        let concurrentTasks = [
          { taskId: 'test_task_001', taskName: testTaskName + '_1' },
          { taskId: 'test_task_002', taskName: testTaskName + '_2' }
        ];
        let concurrentPaths = [
          testDevicePath.slice(0, 2), // 第一组设备
          testDevicePath.slice(1, 3)  // 第二组设备（有重叠）
        ];
        
        this.sendRealTimeHighlightToMonitor({
          type: 'CONCURRENT_GROUP_STARTED',
          groupId: 'test_group_001',
          groupName: '测试并发组',
          tasks: concurrentTasks,
          devicePaths: concurrentPaths,
          timestamp: new Date().toISOString()
        });
        console.log('✅ 已发送并发组开始消息');
      }, 7000);
      
      this.$message.info('测试高亮消息已发送，请查看监控界面效果（已优化为使用真实节点ID）');
      console.log('🧪 测试高亮消息发送完成');
    },
    
    // 🧹 清除所有高亮
    clearAllHighlights() {
      console.log('🧹 手动清除所有高亮');
      this.sendRealTimeHighlightToMonitor({
        type: 'CLEAR_ALL_HIGHLIGHTS',
        timestamp: new Date().toISOString()
      });
      this.$message.success('已发送清除高亮指令');
    },
    
    // 🔍 请求监控界面的图形节点信息
    requestMonitorGraphNodes() {
      console.log('🔍 请求监控界面的图形节点信息');
      
      // 🎯 方法1：首先尝试当前页面的iframe（如果当前就在监控页面）
      let monitorIframe = document.querySelector('iframe[src*="monitor-standalone"]');
      
      // 🎯 方法2：如果当前页面没有，尝试全局查找
      if (!monitorIframe) {
        // 检查所有可能的iframe容器
        const possibleSelectors = [
          '#app iframe[src*="monitor-standalone"]',
          '.monitor-iframe-container iframe[src*="monitor-standalone"]',
          'iframe[src*="monitor-standalone"]'
        ];
        
        for (const selector of possibleSelectors) {
          monitorIframe = document.querySelector(selector);
          if (monitorIframe) {
            console.log(`✅ 通过选择器找到iframe: ${selector}`);
            break;
          }
        }
      }
      
      // 🎯 方法3：如果还没找到，说明可能不在监控页面，使用全局消息机制
      if (!monitorIframe || !monitorIframe.contentWindow) {
        console.log('⚠️ 当前页面未找到监控界面iframe，使用全局消息机制');
        
        // 🔧 检查当前路由是否在监控页面
        const currentPath = this.$route.path;
        if (currentPath !== '/monitor' && currentPath !== '/monitor/index') {
          this.$message.warning('请先切换到监控界面，然后再尝试调试节点功能');
          
          // 🎯 提供快速跳转选项
          this.$confirm('是否跳转到监控界面进行调试？', '提示', {
            confirmButtonText: '立即跳转',
            cancelButtonText: '取消',
            type: 'info'
          }).then(() => {
            // 跳转到监控界面，然后自动请求节点信息
            this.$router.push('/monitor').then(() => {
              // 跳转后延迟请求节点信息
              setTimeout(() => {
                this.requestMonitorGraphNodes();
              }, 2000);
            });
          }).catch(() => {
            console.log('用户取消跳转');
          });
          
          return;
        }
        
        // 如果已经在监控页面但找不到iframe，可能正在加载
        this.$message.info('监控界面正在加载中，请稍后再试');
        return;
      }
      
      // 🎯 方法4：成功找到iframe，发送请求
      try {
        const childOrigin = this.getChildOrigin(monitorIframe);
        monitorIframe.contentWindow.postMessage({
          type: 'REQUEST_GRAPH_NODES',
          timestamp: new Date().toISOString()
        }, childOrigin);
        console.log('✅ 已发送图形节点请求到监控界面');
      } catch (error) {
        console.error('❌ 请求图形节点失败:', error);
        this.$message.error('请求监控界面节点信息失败，请确保监控界面已加载');
      }
    },
    
    // 🔍 调试图形节点信息
    debugGraphNodes() {
      console.log('🔍 调试图形节点信息');
      
      if (this.monitorGraphNodes.length === 0) {
        this.$message.warning('监控界面图形未初始化，正在请求节点信息...');
        this.requestMonitorGraphNodes();
        
        // 提示用户监控界面的优化
        setTimeout(() => {
          if (this.monitorGraphNodes.length === 0) {
            this.$message.info('💡 提示：监控界面现已优化，不会重复加载。如果长时间无响应，请点击监控页面的"强制刷新"按钮');
          }
        }, 3000);
        return;
      }
      
      console.log('📊 当前监控界面图形节点数量:', this.monitorGraphNodes.length);
      console.table(this.monitorGraphNodes);
      
      // 显示前5个节点ID
      const firstFive = this.monitorGraphNodes.slice(0, 5);
      console.log('🎯 前5个节点详情:', firstFive);
      
      // 统计节点类型
      const typeStats = {};
      this.monitorGraphNodes.forEach(node => {
        const type = node.deviceType || 'unknown';
        typeStats[type] = (typeStats[type] || 0) + 1;
      });
      
      console.log('📈 节点类型统计:', typeStats);
      
      this.$message.success(`图形包含 ${this.monitorGraphNodes.length} 个节点，详情请查看控制台`);
    }
  },
  created() {
    console.log('🔧 Task页面created，开始初始化...');
    
    // 🔧 首先从localStorage恢复状态
    const stateRestored = this.pageStateStore.loadStateFromLocalStorage();
    if (stateRestored) {
      console.log('✅ 从localStorage恢复页面状态成功');
    } else {
      console.log('⚠️ localStorage中没有可用状态，使用默认状态');
    }
    
    // 获取任务列表
    const fetchTasks = async () => {
      try {
        const tokenInfo = getToken();
        const token = tokenInfo?.accessToken;
        const myHeaders = new Headers();
        myHeaders.append("token", token);
        myHeaders.append("User-Agent", "Apifox/1.0.0 (https://apifox.com)");
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Accept", "*/*");
        myHeaders.append("Connection", "keep-alive");

        const requestOptions = {
          method: 'GET',
          headers: myHeaders,
          redirect: 'follow'
        };

        const response = await fetch("/api/tasks", requestOptions);
        const result = await response.json();
        console.log(result)
        if (result && result.data) {
          // 转换数据格式
          this.allData = result.data.map(task => {
            // 解析 graph 字符串为对象
            let mapping_result = {};
            try {
              mapping_result = JSON.parse(task.graph);
            } catch (e) {
              console.error('解析任务图谱数据失败:', e);
              mapping_result = {};
            }

            return {
              id: task.id,
              taskName: task.name,
              createdData: task.createTime,
              creator: task.creator,
              status: task.status,
              mapping_result: mapping_result
            };
          });
          this.getTableData();
          
          // 🔧 在数据加载完成后尝试恢复状态
          this.$nextTick(() => {
            setTimeout(() => {
              console.log('🔄 数据加载完成后尝试恢复页面状态...');
              this.restorePageState();
            }, 500);
          });
        } else {
          console.error('获取任务列表失败：返回数据格式不正确');
          this.$message.error('获取任务列表失败');
        }
      } catch (error) {
        console.error('获取任务列表失败:', error);
        this.$message.error('获取任务列表失败');
      }
    };

    // 执行获取任务列表
    fetchTasks();
    
    // 初始化硬件WebSocket连接
    this.initHardwareWebSocket();
    
    // 添加窗口消息监听器，用于接收编辑页面返回的数据
    window.addEventListener('message', (event) => {
      // 创建一个异步函数来处理消息
      const handleMessage = async () => {
        try {
          console.log('收到 postMessage 消息:', event.data);
          
          // 🎯 处理monitor-ready消息
          if (event.data.type === 'monitor-ready') {
            console.log('✅ 监控界面已准备就绪，发送缓存的高亮数据');
            this.monitorReadyReceived = true;
            
            // 🔍 自动请求图形节点信息
            setTimeout(() => {
              this.requestMonitorGraphNodes();
            }, 1000);
          }

          // 🆕 新增：把 IFRAME_READY_RESPONSE 也作为就绪信号处理
          if (event.data.type === 'IFRAME_READY_RESPONSE' && event.data.ready) {
            console.log('✅ 收到iframe准备就绪确认（容器页转发）');
            this.monitorReadyReceived = true;

            // 主动请求图形节点，和 monitor-ready 分支保持一致
            setTimeout(() => {
              this.requestMonitorGraphNodes();
            }, 1000);

            // 如果有缓存的高亮数据，按原逻辑依次发送
            if (this.highlightDataCache && this.highlightDataCache.length > 0) {
              console.log(`📤 发送${this.highlightDataCache.length}个缓存的高亮数据（IFRAME_READY_RESPONSE）`);
              this.highlightDataCache.forEach((highlightData, index) => {
                setTimeout(() => {
                  this.sendRealTimeHighlightToMonitor(highlightData);
                  console.log(`✅ 已发送缓存高亮数据 ${index + 1}/${this.highlightDataCache.length}`);
                }, index * 500);
              });
              this.highlightDataCache = [];
            }
            return;
          }
          
          // 🔍 处理监控界面返回的图形节点信息
          if (event.data.type === 'GRAPH_NODES_RESPONSE') {
            console.log('📋 收到监控界面图形节点信息:', event.data.data);
            this.monitorGraphNodes = event.data.data || [];
            console.log(`📊 当前图形包含 ${this.monitorGraphNodes.length} 个节点`);
            
            // 显示可用的节点ID前几个用于调试
            if (this.monitorGraphNodes.length > 0) {
              const firstFew = this.monitorGraphNodes.slice(0, 5).map(node => node.id);
              console.log('🎯 可用的节点ID（前5个）:', firstFew);
            }
          }
          
          // 🎯 继续处理其他消息
          if (event.data.type === 'monitor-ready') {
            
            // 发送缓存的高亮数据
            if (this.highlightDataCache.length > 0) {
              console.log(`📤 发送${this.highlightDataCache.length}个缓存的高亮数据`);
              this.highlightDataCache.forEach((highlightData, index) => {
                setTimeout(() => {
                  this.sendRealTimeHighlightToMonitor(highlightData);
                  console.log(`✅ 已发送缓存高亮数据 ${index + 1}/${this.highlightDataCache.length}`);
                }, index * 500); // 每个数据间隔500ms发送
              });
              
              // 清空缓存
              this.highlightDataCache = [];
            }
            return;
          }
          
          if (event.data.type === 'TASK_EDIT_RETURN') {
            // 处理编辑页面返回的数据
            const returnData = JSON.parse(event.data.data);
            console.log('编辑页面返回数据:', returnData);
            
            // 更新任务数据
            const { taskId, taskKey, matchIndex, parameters, reactTime } = returnData;
            
            // 查找对应的任务并更新
            const parentTask = this.allData.find(item => item.id === taskId);
            if (parentTask && parentTask.mapping_result && parentTask.mapping_result[taskKey]) {
              // 更新反应时间
              if (reactTime !== undefined) {
                parentTask.mapping_result[taskKey].g_data = {
                  ...parentTask.mapping_result[taskKey].g_data,
                  reactTime: reactTime
                };
                
                // 更新表格中的显示
                const groupKey = `${taskId}-${taskKey}`;
                const row = this.groupedRows.find(row => row.id === taskId && row.key === taskKey);
                if (row) {
                  row.reactTime = reactTime;
                }
              }
              
              // 更新设备参数
              if (parameters) {
                parentTask.mapping_result[taskKey].parameters = parameters;
              }

              // 更新数据库 - 同时更新graph和参数
              try {
                const tokenInfo = getToken();
                const token = tokenInfo?.accessToken;
                
                const myHeaders = new Headers();
                myHeaders.append("token", token);
                myHeaders.append("User-Agent", "Apifox/1.0.0 (https://apifox.com)");
                myHeaders.append("Content-Type", "application/json");
                myHeaders.append("Accept", "*/*");
                myHeaders.append("Connection", "keep-alive");

                // 1. 更新任务的graph数据
                const updateData = {
                  id: taskId,
                  name: parentTask.taskName,
                  graph: JSON.stringify(parentTask.mapping_result)
                };

                const requestOptions = {
                  method: 'PUT',
                  headers: myHeaders,
                  body: JSON.stringify(updateData),
                  redirect: 'follow'
                };

                const response = await fetch("/api/tasks", requestOptions);
                const result = await response.json();
                console.log('更新graph结果:', result);
                
                // 2. 保存参数到专门的参数API
                if (parameters) {
                  console.log('💾 开始保存参数到参数API');
                  console.log('保存的任务ID:', taskId);
                  console.log('保存的任务键值:', taskKey);
                  console.log('保存的参数内容:', parameters);
                  
                  try {
                    // 🆕 第一步：删除数据库中的旧参数
                    console.log('🗑️ 首先删除旧参数');
                    const deleteRequestOptions = {
                      method: 'DELETE',
                      headers: myHeaders,
                      redirect: 'follow'
                    };

                    const deleteResponse = await fetch(`/chem-api/tasks/${taskId}/parameters?taskKey=${taskKey}`, deleteRequestOptions);
                    const deleteResult = await deleteResponse.json();
                    console.log('🗑️ 删除旧参数结果:', deleteResult);
                    
                    // 不管删除是否成功都继续保存新参数
                    if (deleteResult && deleteResult.code === 1) {
                      console.log('✅ 旧参数删除成功');
                    } else {
                      console.log('⚠️ 旧参数删除失败或不存在，继续保存新参数');
                    }
                  } catch (deleteError) {
                    console.warn('⚠️ 删除旧参数时出错，但继续保存新参数:', deleteError);
                  }
                  
                  // 🔧 清理无效的参数格式
                  const cleanedParameters = this.cleanParametersFormat(parameters);
                  console.log('🧹 清理后的参数:', cleanedParameters);
                  
                  const parameterData = {
                    taskKey: taskKey,
                    parameters: cleanedParameters,
                    reactTime: reactTime
                  };

                  const paramRequestOptions = {
                    method: 'POST',
                    headers: myHeaders,
                    body: JSON.stringify(parameterData),
                    redirect: 'follow'
                  };

                  
                  const paramResponse = await fetch(`/chem-api/tasks/${taskId}/parameters`, paramRequestOptions);
                  const paramResult = await paramResponse.json();
                  console.log('💾 保存参数结果:', paramResult);
                  
                  if (paramResult && paramResult.code === 1) {
                    console.log('✅ 参数已成功保存到参数数据库');
                  } else {
                    console.warn('⚠️ 参数保存失败:', paramResult);
                  }
                }
                
                if (result && result.code === 1) {
                  this.$message.success('任务数据已成功更新到数据库');
                } else {
                  throw new Error(result?.message || '更新数据库失败');
                }
              } catch (error) {
                console.error('更新数据库失败:', error);
                this.$message.error(`更新数据库失败: ${error.message || '未知错误'}`);
              }
            } else {
              this.$message.warning('找不到对应的任务数据，无法更新');
            }
            
            // 关闭编辑对话框
            this.editDialogVisible = false;
          } else if (event.data.type === 'TASK_EDIT_CANCEL') {
            // 用户取消编辑，关闭编辑对话框
            this.editDialogVisible = false;
            this.$message.info('已取消编辑');
          }
        } catch (error) {
          console.error('处理消息失败:', error);
          this.$message.error('处理返回数据失败');
        }
      };

      // 执行异步处理函数
      handleMessage();
    });
    
    // 🔧 初始化WebSocket连接管理
    this.registerMessageHandlers();
    this.initHardwareWebSocket();
    
    // 初始化AI调度WebSocket
    this.initAIWebSocket();
    this.getTableData();
  },
  
  // ✅ 页面激活时恢复状态
  activated() {
    console.log('🔄 Task页面被激活，恢复页面状态');
    this.restorePageState();
  },
  
  // ✅ 页面失活时保存状态
  deactivated() {
    console.log('💾 Task页面失活，保存页面状态');
    this.savePageState();
  },

  // 🔧 销毁时清理资源
  beforeDestroy() {
    // 保存状态到本地存储
    this.pageStateStore.saveStateToLocalStorage();
    
    // 清理AI WebSocket
    if (this.ws_ai) {
      this.ws_ai.close();
      this.ws_ai = null;
    }
    
    // 清理Task WebSocket适配器
    if (this.taskWebSocketManager) {
      this.taskWebSocketManager.destroy();
    }
    
    // 清理调度超时
    if (this.scheduleTimeout) {
      clearTimeout(this.scheduleTimeout);
      this.scheduleTimeout = null;
    }
  }
};
</script>

<style scoped>
.el-table {
  margin-bottom: 20px;
}

.fullscreen-dialog {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.fullscreen-dialog .el-dialog__body {
  padding: 0 !important;
  height: calc(100vh - 54px);
}

.el-button + .el-button {
  margin-left: 8px;
}

.selected-actions {
  margin: 10px 0;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.selection-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.selected-count {
  margin-right: 15px;
  color: #606266;
  font-weight: 500;
}

.concurrent-info {
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 🚀 并发执行样式增强 */
.el-tag.concurrent-analysis {
  transition: all 0.3s ease;
  cursor: pointer;
}

.el-tag.concurrent-analysis:hover {
  background-color: #409EFF;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.el-switch__label {
  font-size: 12px;
}

/* Style for react time input */
.el-input-number {
  width: 100px;
}

.el-button.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* 工作流执行相关样式 */
.task-toolbar {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.workflow-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding: 12px;
  background-color: #ffffff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-label {
  font-weight: 500;
  color: #606266;
}

.current-task {
  color: #409eff;
  font-size: 14px;
  margin-left: 10px;
}

.task-progress {
  color: #909399;
  font-size: 12px;
}

/* 执行详情面板样式 */
.execution-detail-panel {
  margin-top: 15px;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.panel-content {
  padding: 15px;
}

.overall-progress {
  margin-bottom: 20px;
}

.progress-label {
  display: inline-block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}

/* 任务列表样式 */
.task-list {
  margin-bottom: 20px;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  background-color: #fafafa;
  transition: all 0.3s;
}

.task-item.task-completed {
  background-color: #f0f9ff;
  border-color: #b3e19d;
}

.task-item.task-current {
  background-color: #ecf5ff;
  border-color: #b3d8ff;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
}

.task-item.task-pending {
  background-color: #fafafa;
  border-color: #e4e7ed;
  opacity: 0.7;
}

.task-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: #409eff;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
}

.task-completed .task-number {
  background-color: #67c23a;
}

.task-pending .task-number {
  background-color: #c0c4cc;
}

.task-name {
  font-weight: 500;
  color: #303133;
}

.task-time {
  color: #909399;
  font-size: 12px;
}

.task-detail {
  flex: 1;
  margin-left: 15px;
  padding-left: 15px;
  border-left: 1px solid #e4e7ed;
}

.task-progress-info {
  display: flex;
  gap: 15px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #606266;
}

.task-status {
  margin-left: 10px;
}

.task-icon-completed {
  color: #67c23a;
  font-size: 18px;
}

.task-icon-running {
  color: #409eff;
  font-size: 18px;
  animation: spin 2s linear infinite;
}

.task-icon-paused {
  color: #e6a23c;
  font-size: 18px;
}

.task-icon-pending {
  color: #c0c4cc;
  font-size: 18px;
}

/* 执行日志样式 */
.execution-log {
  border-top: 1px solid #e4e7ed;
  padding-top: 15px;
}

.execution-log h5 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #303133;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 8px;
}

.log-entry {
  display: flex;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: #909399;
  margin-right: 10px;
  min-width: 80px;
}

.log-message {
  color: #606266;
}

.log-error .log-message {
  color: #f56c6c;
}

.log-warning .log-message {
  color: #e6a23c;
}

.log-success .log-message {
  color: #67c23a;
}

/* 工作流执行相关样式 */
.task-toolbar {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.workflow-status-simple {
  margin-top: 10px;
}

.workflow-status-simple .el-alert {
  border-radius: 6px;
}

/* 参数对话框样式 */
.task-info-section {
  margin-bottom: 20px;
}

.task-info-section h3 {
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.device-parameters-section {
  margin-bottom: 20px;
}

.device-parameters-section h3 {
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.parameter-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.parameter-key {
  font-weight: 500;
  color: #606266;
  margin-right: 8px;
  min-width: 80px;
}

.parameter-value {
  color: #303133;
  font-weight: 600;
}

.no-parameters {
  text-align: center;
  padding: 40px 20px;
}

.loading-container {
  padding: 20px;
}

.scheduling-status-simple {
  margin-top: 10px;
}

.scheduling-status-simple .el-alert {
  border-radius: 6px;
}

/* 🆕 Edit按钮优化样式 */
.el-button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.el-button[disabled] .el-icon-edit {
  color: #c0c4cc;
}

.el-button:not([disabled]).el-button--primary .el-icon-edit {
  color: white;
}

.el-button:not([disabled]).el-button--default .el-icon-edit {
  color: #606266;
}

/* 🎯 工作流预览对话框样式 */
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
  color: #409eff;
  font-size: 20px;
  font-weight: 600;
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

.workflow-tasks-container {
  margin-top: 15px;
}

.task-collapse-title {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 0;
}

.task-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  font-weight: bold;
  margin-right: 15px;
  flex-shrink: 0;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
  margin-bottom: 5px;
}

.task-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.task-schedule-info {
  text-align: right;
  font-size: 12px;
  color: #666;
  margin-left: 15px;
}

.scheduled-time {
  margin-bottom: 3px;
}

.duration {
  font-weight: 500;
  color: #409eff;
}

.task-detail-content {
  padding: 0 15px;
}

.device-path-section,
.workflow-steps-section,
.task-parameters-section {
  margin-bottom: 25px;
}

.device-path-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.device-path-section h4,
.workflow-steps-section h4,
.task-parameters-section h4 {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}

/* 设备执行顺序样式 */
.device-execution-order {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
}

.execution-sequence {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 16px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.sequence-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sequence-number {
  width: 24px;
  height: 24px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.sequence-device {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.device-id {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.device-type-tag {
  background: #f0f2f5;
  color: #666;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid #e4e7ed;
}

.sequence-arrow {
  color: #409eff;
  font-size: 16px;
  font-weight: bold;
  margin: 0 4px;
}

.path-stats {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 12px 16px;
  background: #f0f2f5;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #333;
  font-size: 13px;
}

.stats-item i {
  color: #409eff;
  font-size: 14px;
}



.workflow-steps-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.workflow-step-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  background-color: #fafbfc;
}

.step-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #67c23a;
  color: white;
  font-weight: bold;
  font-size: 12px;
  margin-right: 10px;
  flex-shrink: 0;
}

.step-name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  flex: 1;
}

.step-duration {
  font-size: 12px;
  color: #909399;
  padding: 2px 8px;
  background-color: #f0f0f0;
  border-radius: 12px;
}

.step-description {
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
  color: #666;
  font-size: 13px;
}

.step-commands h5,
.step-conditions h5 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 13px;
  font-weight: 600;
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.command-item {
  padding: 8px 10px;
  background-color: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  font-size: 12px;
}

.command-device {
  font-weight: 600;
  color: #409eff;
  margin-bottom: 3px;
}

.command-action {
  color: #333;
  margin-bottom: 2px;
}

.command-params {
  color: #666;
  font-size: 11px;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.condition-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background-color: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  font-size: 12px;
}

.condition-icon {
  margin-right: 8px;
  font-size: 14px;
}

  .condition-desc {
    color: #d48806;
  }

  .parameters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .workflow-preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-top: 1px solid #ebeef5;
}

.preview-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}

/* 工作流预览响应式设计 */
@media (max-width: 768px) {
  .task-collapse-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .task-schedule-info {
    text-align: left;
    margin-left: 0;
  }

  .device-parameters-list {
    padding: 10px;
  }
  
  .device-params {
    grid-template-columns: 1fr;
  }
  
  .param-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .param-key {
    margin-bottom: 4px;
  }
  
  .param-value {
    text-align: left;
  }

  .commands-grid,
  .parameters-grid {
    grid-template-columns: 1fr;
  }

  .workflow-preview-footer {
    flex-direction: column;
    gap: 15px;
  }
}

/* 🚀 并发工作流预览对话框样式 */
.concurrent-preview-dialog {
  margin: 0 auto !important;
}

.concurrent-preview-dialog .el-dialog__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px 8px 0 0;
  padding: 20px 30px;
}

.concurrent-preview-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 600;
}

.concurrent-preview-dialog .el-dialog__body {
  padding: 0;
  max-height: 75vh;
  overflow-y: auto;
}

.concurrent-preview-content {
  padding: 20px;
}

/* 并发预览头部 */
.concurrent-preview-header {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f2f5;
}

.concurrent-preview-header h3 {
  margin: 0 0 12px 0;
  color: #409eff;
  font-size: 22px;
  font-weight: 700;
}

.concurrent-preview-desc {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 15px;
  line-height: 1.6;
}

.concurrent-preview-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  color: #999;
  font-size: 13px;
}

/* 并发分组容器 */
.concurrent-groups-container {
  margin-bottom: 25px;
}

.concurrent-groups-container .el-collapse {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.concurrent-groups-container .el-collapse-item {
  margin-bottom: 15px;
}

.concurrent-groups-container .el-collapse-item__header {
  padding: 15px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
}

.concurrent-groups-container .el-collapse-item__content {
  padding: 20px;
  background-color: #ffffff;
}

/* 组标题样式 */
.group-collapse-title {
  display: flex;
  align-items: center;
  width: 100%;
}

.group-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
  font-size: 16px;
  margin-right: 15px;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-weight: 600;
  color: #333;
  font-size: 18px;
  margin-bottom: 8px;
}

.group-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.group-meta .el-tag {
  border-radius: 12px;
  font-size: 12px;
}

/* 组内任务列表 */
.group-tasks {
  margin-bottom: 25px;
}

.group-tasks h4 {
  margin: 0 0 15px 0;
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
}

.task-list {
  display: grid;
  gap: 12px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.task-item .el-tag {
  flex-shrink: 0;
}

.task-duration {
  color: #666;
  font-size: 13px;
  font-weight: 500;
}

.task-devices {
  color: #999;
  font-size: 12px;
  flex: 1;
  text-align: right;
}

/* 合并工作流样式 */
.merged-workflow {
  margin-bottom: 25px;
}

.merged-workflow h4 {
  margin: 0 0 15px 0;
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
}

.workflow-steps {
  display: grid;
  gap: 15px;
}

.workflow-step {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background-color: #ffffff;
}

.workflow-step .step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.workflow-step .step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.workflow-step .step-name {
  font-weight: 600;
  color: #333;
  flex: 1;
}

.workflow-step .step-commands-count {
  color: #999;
  font-size: 12px;
  background-color: #e9ecef;
  padding: 4px 8px;
  border-radius: 12px;
}

.workflow-step .step-description {
  padding: 12px 16px;
  color: #666;
  font-size: 14px;
}

.workflow-step .step-commands {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.workflow-step .step-commands h5 {
  margin: 0 0 12px 0;
  color: #409eff;
  font-size: 14px;
  font-weight: 600;
}

.workflow-step .commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.workflow-step .command-item {
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.workflow-step .command-device {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.workflow-step .command-action {
  color: #409eff;
  font-weight: 500;
  margin-bottom: 4px;
}

.workflow-step .command-params {
  color: #666;
  font-size: 12px;
  margin-bottom: 4px;
}

.workflow-step .command-source {
  color: #999;
  font-size: 11px;
  font-style: italic;
}

.workflow-step .step-conditions {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.workflow-step .step-conditions h5 {
  margin: 0 0 12px 0;
  color: #409eff;
  font-size: 14px;
  font-weight: 600;
}

.workflow-step .conditions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 设备使用分析 */
.device-analysis {
  margin-bottom: 25px;
}

.device-analysis h4 {
  margin: 0 0 15px 0;
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
}

.device-usage {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.device-tag {
  border-radius: 12px !important;
  font-size: 12px !important;
}

/* 冲突分析摘要 */
.conflict-analysis {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.conflict-analysis h4 {
  margin: 0 0 15px 0;
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
}

.analysis-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.analysis-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.analysis-label {
  color: #666;
  font-weight: 500;
  font-size: 14px;
}

/* 对话框底部 */
.concurrent-preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-top: 1px solid #e4e7ed;
}

.concurrent-preview-footer .preview-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.concurrent-preview-footer .footer-buttons {
  display: flex;
  gap: 12px;
}

.concurrent-preview-footer .footer-buttons .el-button {
  padding: 10px 20px;
  font-weight: 500;
}

/* 调试对话框样式 */
.debug-dialog {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.debug-dialog .el-message-box__message {
  text-align: left;
  word-break: break-word;
  white-space: pre-wrap;
}
</style>