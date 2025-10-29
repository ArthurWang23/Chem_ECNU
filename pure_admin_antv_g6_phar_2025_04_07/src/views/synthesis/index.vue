<template>
  <div class="synthesis-page">
    <div class="synthesis-container">
      <div class="left-side">
        <div class="search-container">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="smiles..."
            class="search-input"
          />
          <button @click="synthesis_analysis" class="search-button">
            query
          </button>
          <el-upload
            action=""
            :auto-upload="false"
            :on-change="handleUploadSuccess"
            :show-file-list="false"
          >
            <button class="upload-button">upload</button>
          </el-upload>
        </div>
        <div class="content-layout">
          <div class="configures">
            <el-tabs v-model="activeTab" @tab-click="handleclick">
              <el-tab-pane label="Single-Step">
                <div class="config-item">
                  <div class="title">model type</div>
                  <el-radio-group v-model="tag1">
                    <el-radio label="Templete">Templete</el-radio>
                    <el-radio label="AI">AI</el-radio>
                  </el-radio-group>
                </div>
                <div class="config-item">
                  <div class="title">w/wo reaction conditon</div>
                  <el-radio-group v-model="condition1">
                    <el-radio label="with conditions">with conditions</el-radio>
                    <el-radio label="without conditions"
                      >without conditions</el-radio
                    >
                  </el-radio-group>
                </div>
                <div class="confir-item">
                  <div class="title">rank</div>
                  <el-input v-model="rank1" placeholder="top" />
                </div>
                <div class="map-controls">
                  <el-button
                    type="primary"
                    @click="handleMapClick"
                    class="map-button"
                  >
                    <span>Reaction Map</span>
                  </el-button>
                </div>
              </el-tab-pane>
              <el-tab-pane label="Multi-Step">
                <div class="config-item">
                  <div class="title">model type</div>
                  <el-radio-group v-model="tag2">
                    <el-radio label="Templete">Templete</el-radio>
                    <el-radio label="AI">AI</el-radio>
                  </el-radio-group>
                </div>
                <div class="config-item">
                  <div class="title">w/wo reaction conditon</div>
                  <el-radio-group v-model="condition2">
                    <el-radio label="with conditions">with conditions</el-radio>
                    <el-radio label="without conditions"
                      >without conditions</el-radio
                    >
                  </el-radio-group>
                </div>
                <div class="confir-item">
                  <div class="title">rank</div>
                  <el-input v-model="rank2" placeholder="top" />
                </div>
                <div class="map-controls">
                  <el-button
                    type="primary"
                    @click="handleMapClick"
                    class="map-button"
                  >
                    <span>Reaction Map</span>
                  </el-button>
                </div>
              </el-tab-pane>
              <el-tab-pane label="Condition-Pre">
                <div class="config-item">
                  <div class="title">model type</div>
                  <el-radio-group v-model="tag3">
                    <el-radio label="Templete">Templete</el-radio>
                    <el-radio label="AI">AI</el-radio>
                  </el-radio-group>
                </div>
                <div class="config-item">
                  <div class="title">w/wo reaction conditon</div>
                  <el-radio-group v-model="condition3">
                    <el-radio label="with conditions">with conditions</el-radio>
                    <el-radio label="without conditions"
                      >without conditions</el-radio
                    >
                  </el-radio-group>
                </div>
                <div class="confir-item">
                  <div class="title">rank</div>
                  <el-input v-model="rank3" placeholder="top" />
                </div>
                <div class="map-controls">
                  <el-button
                    type="primary"
                    @click="handleMapClick"
                    class="map-button"
                  >
                    <span>Reaction Map</span>
                  </el-button>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
          <div id="graph-container" ref="container" class="graph-container" />
        </div>
      </div>
      <div class="slides-container">
        <div class="slides-header">
          <h3 class="slides-title">List</h3>
        </div>
        <div class="slides-list">
          <div
            v-for="(item, index) in TreeList"
            :key="index"
            class="slide-item"
            :class="{ active: currentSlide === index }"
            @click="handleSlideClick(index)"
          >
            <div class="slide-content">
              <span class="slide-number">{{ index + 1 }}</span>
              <span class="slide-name">{{ item.id }}</span>
            </div>
            <div class="slide-actions">
              <el-icon
                class="action-icon view-icon"
                @click.stop="showSlideDetails(index)"
              >
                <View />
              </el-icon>
              <el-icon
                class="action-icon delete-icon"
                @click.stop="deleteSlide(index)"
              >
                <Delete />
              </el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 弹窗 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="800px"
        draggable
        :append-to-body="true"
      >
        <div class="dialog-content-container">
          <!-- Ketcher iframe (always visible) -->
          <div class="molecule">
            <iframe
              class="frame"
              id="idKetcher"
              src="public\ketcher\standalone\index.html"
              width="100%"
              :height="iframeHeight"
              style="display: block; margin: 0 auto; border: 0"
            />
          </div>
          
          <!-- Reaction details table (only for # nodes) -->
          <div v-if="isReactionNode" class="reaction-table-container">
            <h4>Reaction Conditions</h4>
            <el-table
              :data="currentReactionDetails"
              style="width: 100%"
              height="250"
              border
              @cell-dblclick="handleCellDblClick"
            >
              <el-table-column 
                prop="index" 
                label="No." 
                width="80" 
                align="center"
              />
              <el-table-column 
                prop="condition" 
                label="Condition"
                min-width="300"
              >
                <template #default="{ row, $index }">
                  <span 
                    v-if="editingIndex !== $index" 
                    style="white-space: pre-line"
                    @dblclick="startEditing($index, 'condition', $event)"
                  >
                    {{ row.condition }}
                  </span>
                  <el-input
                    v-else
                    v-model="editingValue"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    @blur="saveEditing(row)"
                    @keydown.enter.prevent="handleTextareaEnter(row)"
                    v-focus
                  />
                </template>
              </el-table-column>
              <el-table-column 
                prop="score" 
                label="Score" 
                width="120" 
                align="center"
              />
            </el-table>
          </div>
        </div>

        <span slot="footer" class="dialog-footer">
          <el-button @click="dialogVisible = false">Close</el-button>
          <el-button @click="saveMolfile" v-if="!isReactionNode">Save</el-button>
        </span>
      </el-dialog>

      <el-dialog v-model="showDetailsDialog" title="详细信息" width="800px">
        <div class="table-content">
          <el-table
            :data="currentSlideDetails"
            style="width: 100%"
            height="100%"
          >
            <el-table-column prop="index" label="#" width="60" />
            <el-table-column prop="step" label="step" width="80" />
            <el-table-column prop="score" label="score" width="80" />
            <el-table-column prop="product" label="product" min-width="200" />
            <el-table-column prop="reactant" label="reactant" min-width="350" />
            <el-table-column prop="condition" label="condition" min-width="400">
              <template #default="{ row }">
                <span style="white-space: pre-line">{{ row.condition }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="react" label="react" min-width="450" />
            <el-table-column prop="template" label="template" min-width="400" />
          </el-table>
        </div>
      </el-dialog>
    </div>
    <el-dialog
      v-model="showAddTaskDialog"
      title="Add New Task"
      width="50%"
      @close="resetAddTaskForm"
    >
      <el-form :model="addTaskForm" :rules="addTaskRules" ref="addTaskFormRef">
        <el-form-item label="ID" prop="id">
          <el-input v-model="addTaskForm.id" disabled />
        </el-form-item>
        <el-form-item label="Created Date" prop="createdData">
          <el-date-picker
            v-model="addTaskForm.createdData"
            type="datetime"
            placeholder="Select date and time"
            value-format="yyyy-MM-dd HH:mm:ss"
            disabled
          />
        </el-form-item>
        <el-form-item label="Creator" prop="creator">
          <el-input v-model="addTaskForm.creator" disabled />
        </el-form-item>
        <el-form-item label="Task Name" prop="taskName" required>
          <el-input
            v-model="addTaskForm.taskName"
            placeholder="Enter task name"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTaskDialog = false">Cancel</el-button>
        <el-button type="primary" @click="confirmAddTask">Confirm</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  ref,
  onBeforeUnmount,
  watch,
  nextTick,
  computed
} from "vue";
import axios from 'axios';
import { getToken, formatToken } from "@/utils/auth";
import { View, Delete } from "@element-plus/icons-vue";
import { router, resetRouter } from "@/router";
import G6 from "@antv/g6";
import { ElMessage } from "element-plus";
import { StandaloneStructService } from "ketcher-standalone";
import { Ketcher } from "ketcher-core";
import { useUserStoreHook } from "@/store/modules/user";
// let structService = new StandaloneStructService({
//   apiPath: "api_path"
// });
// let ketcherInstance = new Ketcher(
//   {
//     editor: {
//       isDitrty: false,
//       setOrigin: () => {},
//       struct: {},
//       structToAddFragment: {}
//     }
//   },
//   structService,
//   {}
// );
let structService = new StandaloneStructService({});
let ketcherInstance = new Ketcher({}, structService, {});
const container = ref();
const dialogVisible = ref(false); // 控制弹窗的显示
// New state variables
const dialogTitle = ref('Node Information');
const iframeHeight = ref('400');
const isReactionNode = ref(false);
const editingIndex = ref(-1);
const editingField = ref('');
const editingValue = ref('');

// Add these new methods
const handleCellDblClick = (row: any, column: any, cell: any, event: Event) => {
  if (column.property === 'condition') {
    startEditing(row.index - 1, 'condition', event);
  }
};

const startEditing = (index: number, field: string, event: Event) => {
  editingIndex.value = index;
  editingField.value = field;
  editingValue.value = currentReactionDetails.value[index][field];
  event.stopPropagation();
};

const saveEditing = (row: any) => {
  if (editingIndex.value !== -1) {
    // Update the local table data
    currentReactionDetails.value[editingIndex.value][editingField.value] = editingValue.value;
    
    // Find and update the corresponding data in dataList
    const slideData = dataList.value[currentSlide.value];
    const selectedNodes = graph.findAllByState("node", "selected")[0];
    const stepNumber = selectedNodes.getModel().id;
    const reactionData = slideData.find(item => 
      item.step === stepNumber
    );
    if (reactionData) {
      // Reconstruct the condition string from the edited table data
      reactionData.condition = currentReactionDetails.value
        .map(item => item.condition + (item.score ? `, ${item.score}` : ''))
        .join('\n');
      const lines = reactionData.condition.split('\n');
      const result = {};

      lines.forEach((line, index) => {
        const parts = line.split(', ').map(part => part.trim());
        result[index.toString()] = parts;
      });
      // 找到对应节点并更新其图像
      const node = graph.findById(stepNumber);
      if (node) {
        // 更新节点数据
        const model = node.getModel();
        model.condition = result;
      }
    }
    editingIndex.value = -1;
    editingField.value = '';
    editingValue.value = '';
  }
};

// Add this directive for auto-focusing the input
const vFocus = {
  mounted: (el: HTMLElement) => el.querySelector('textarea')?.focus()
};

const currentReactionDetails = ref<Array<{
  index: number;
  condition: string;
  score: string;
}>>([]);

// Format condition data
const formatConditionData = (conditionStr: string, defaultScore: string) => {
  if (!conditionStr) return [];
  
  return conditionStr.split('\n')
    .filter(line => line.trim()) // Filter empty lines
    .map((line, index) => {
      const lastCommaIndex = line.lastIndexOf(',');
      let condition = line;
      let score = '';
      
      if (lastCommaIndex > -1) {
        condition = line.substring(0, lastCommaIndex).trim();
        score = line.substring(lastCommaIndex + 1).trim();
      }
      
      return {
        index: index + 1,
        condition,
        score: score || defaultScore
      };
    });
};

watch(dialogVisible, async newVal => {
  if (newVal) {
    await initKetcher();
  }
});
const nodeContent = ref([]); // 存储节点内容
let ketcher = null;

const getSmiles = async () => {
  if (!ketcher) {
    return;
  }
  const smiles = await ketcher.getSmiles();
  const img = await ketcherInstance.generateImage(smiles, {
    outputFormat: "svg",
    backgroundColor: "255, 255, 255"
  });
  return {
    img: img,
    smiles: smiles
  };
};

const saveMolfile = async () => {
  try {
    const file = await getSmiles();
    if (file) {
      // 获取当前选中的节点
      const selectedNodes = graph.findAllByState("node", "selected");
      if (selectedNodes.length > 0) {
        const selectedNode = selectedNodes[0];
        // 使用 getModel().id 替代 getID()
        await updateNodeImage(selectedNode.getModel().id, file.smiles);
        removeNode(selectedNode.getModel());
      }

      // 关闭对话框
      dialogVisible.value = false;
      
    }
  } catch (error) {
    console.error("Error saving molfile:", error);
  }
};
const frameIsLoaded = ref(false);
const initKetcher = async () => {
  try {
    console.log("init=========");

    await nextTick();
    let ketcherFrame = document.getElementById(
      "idKetcher"
    ) as HTMLIFrameElement;
    // 等待 ketcher 加载完成
    const waitForKetcher = () => {
      return new Promise(resolve => {
        ketcherFrame.onload = () => {
          frameIsLoaded.value = true;
          if (ketcherFrame && ketcherFrame.contentWindow) {
            try {
              setTimeout(() => {
                ketcher = (ketcherFrame.contentWindow as any).ketcher;
                resolve(ketcher);
              }, 500);
            } catch (err) {
              console.error("Error accessing ketcher:", err);
              resolve(null);
            }
          }
        };
      });
    };
    if (!frameIsLoaded.value) {
      await waitForKetcher();
    }

    // 获取当前选中的节点
    const selectedNodes = graph.findAllByState("node", "selected");
    console.log(selectedNodes, "====selectedNodes", ketcher);
    if (selectedNodes.length > 0 && ketcher) {
      const selectedNode = selectedNodes[0];
      const model = selectedNode.getModel();
      // 如果节点有 smiles，设置到 ketcher
      if (model.smiles) {
        try {
          await ketcher.setMolecule(model.smiles);
        } catch (error) {
          console.error("Error setting molecule:", error);
        }
      } else {
        console.log(model.id);
        console.log(dataList.value);
        const foundItem = dataList.value[currentSlide.value].find(
          item => item.step == model.id
        );
        await ketcher.setMolecule(foundItem.react);
      }
    }
  } catch (error) {
    console.error("Error initializing ketcher:", error);
  }
};

var dataList = ref([]);
const TreeList = ref([
  {
    id: "Tree1",
    icon: "icon2.png",
    smiles: "",
    children: []
  }
]);
const getRealTreeList = computed(() => {
  return TreeList.value.map(item => ({
    ...item,
    icon: item.icon || "icon2.png"
  }));
});

var ws_ai = new WebSocket("ws://localhost:3004");

const currentSlide = ref(0);
let graph: any = null;

const searchQuery = ref("");
const tag1 = ref("Templete");
const tag2 = ref("Templete");
const tag3 = ref("Templete");
const condition1 = ref("with conditions");
const condition2 = ref("with conditions");
const condition3 = ref("with conditions");
const rank1 = ref("10");
const rank2 = ref("10");
const rank3 = ref("10");
const activeTab = ref("0");
const username = ref(useUserStoreHook()?.username);

const showAddTaskDialog = ref(false);
const addTaskFormRef = ref(null);
const addTaskForm = ref({
  id: "",
  createdData: new Date(),
  creator: 'ecnuer',
  taskName: "",
  status: 0,
});

const showDetailsDialog = ref(false);
const currentSlideDetails = ref([]);

const handleUploadSuccess = (response: any, file: any) => {
  ElMessage.success("上传成功");
};

const initTree = () => {
  const width = container.value.clientWidth || 800;
  const height = container.value.clientHeight || 600;

  // 注册自定义节点
  G6.registerNode("custom-node", {
    draw: (cfg: any, group: any) => {
      console.log(cfg, "====cfg");

      const width = 200;
      const height = 60;
      const x = -width / 2;
      const y = -height / 2;

      // 创建按钮组
      const buttons = [
        { name: "add", text: "+", x: width / 2 + 50, color: "#52c41a" },
        { name: "collapse", text: "-", x: width / 2 + 75, color: "#1890ff" },
        { name: "delete", text: "×", x: width / 2 + 100, color: "#ff4d4f" }
      ];

      // 根据深度决定节点形状
      let keyShape;
      if (cfg.depth % 2 === 0) {
        keyShape = group.addShape("rect", {
          attrs: {
            x,
            y,
            width,
            height,
            radius: 8,
            fill: "#fff",
            stroke: "#e2e8f0",
            lineWidth: 1,
            shadowColor: "#e2e8f0",
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 5
          },
          name: "key-shape"
        });
        const { icon } = cfg;
        group.addShape("image", {
          attrs: {
            x: x + 80,
            y: y + 10,
            width: 40,
            height: 40,
            // img: "icon.png"
            img: icon || "icon2.png"
          },
          name: "image"
        });
      } else {
        keyShape = group.addShape("circle", {
          attrs: {
            x: x + 100,
            y,
            r: 15,
            stroke: "#ccc",
            lineWidth: 2
          }
        });
        group.addShape("text", {
          attrs: {
            text: cfg.id, // 使用节点的 id 作为文字内容
            x: x + 100, // 圆形节点的中心 x 坐标
            y: y, // 圆形节点的中心 y 坐标
            textAlign: "center", // 文字水平居中
            textBaseline: "middle", // 文字垂直居中
            fill: "#000", // 文字颜色
            fontSize: 10 // 文字大小
          },
          name: "child-node-text"
        });
      }

      // 创建透明的 hover 区域
      group.addShape("circle", {
        attrs: {
          x: x + 100,
          y,
          r: 15,
          fill: "rgba(0, 0, 0, 0)",
          cursor: "pointer"
        },
        name: "hover-area"
      });

      // 添加按钮
      buttons.forEach(btn => {
        group.addShape("circle", {
          attrs: {
            x: x + btn.x,
            y,
            r: 10,
            fill: "#fff",
            stroke: btn.color,
            lineWidth: 1,
            cursor: "pointer",
            opacity: 0
          },
          name: `${btn.name}-button`
        });

        group.addShape("text", {
          attrs: {
            x: x + btn.x,
            y,
            text: btn.text,
            fontSize: 14,
            textAlign: "center",
            textBaseline: "middle",
            fill: btn.color,
            cursor: "pointer",
            opacity: 0
          },
          name: `${btn.name}-button-text`
        });
      });

      return keyShape;
    },

    setState(name: string, value: boolean, item: any) {
      const group = item.getContainer();
      const shapes = group.get("children");

      // 处理 hover 状态
      if (name === "hover") {
        shapes?.forEach((shape: any) => {
          const shapeName = shape.get("name");
          if (shapeName?.includes("-button")) {
            shape.attr("opacity", value ? 1 : 0);
            if (shapeName.endsWith("-button")) {
              const color = shape.attr("stroke");
              shape.attr("fill", value ? color : "#fff");
              const textShape = shapes.find(
                (s: any) => s.get("name") === shapeName + "-text"
              );
              if (textShape) {
                textShape.attr("fill", value ? "#fff" : color);
              }
            }
          }
        });
      }

      // 添加选中状态的处理
      if (name === "selected") {
        const keyShape = group.get("children")[0]; // 获取主要形状
        if (value) {
          keyShape.attr({
            stroke: "#1890ff",
            lineWidth: 2,
            shadowColor: "#1890ff",
            shadowBlur: 10
          });
        } else {
          keyShape.attr({
            stroke: "#e2e8f0",
            lineWidth: 1,
            shadowColor: "#e2e8f0",
            shadowBlur: 10
          });
        }
      }
    }
  });

  graph = new G6.TreeGraph({
    container: container.value,
    width,
    height,
    pixelRatio: 2,
    modes: {
      default: ["drag-canvas", "zoom-canvas"]
    },
    defaultNode: {
      shape: "custom-node",
      size: [200, 60],
      anchorPoints: [
        [0.5, 0],
        [0.5, 1]
      ]
    },
    animate: true,
    defaultEdge: {
      type: "cubic-vertical",
      style: {
        stroke: "#A3B1BF",
        lineWidth: 1
      }
    },
    layout: {
      type: "compactBox",
      direction: "TB",
      getId: function getId(d) {
        return d.id;
      },
      getHeight: function getHeight() {
        return 40;
      },
      getWidth: function getWidth() {
        return 200;
      },
      getVGap: function getVGap() {
        return 50;
      },
      getHGap: function getHGap() {
        return 40;
      }
    }
  });

  // 注册节点点击事件
  graph.on("node:click", (evt: any) => {
    const target = evt.target;
    const node = evt.item;
    const model = node.getModel();
    const name = target.get("name") || "";

    // Clear all selected nodes
    graph.findAllByState("node", "selected").forEach((node: any) => {
      graph.setItemState(node, "selected", false);
    });

    // Set current node as selected
    graph.setItemState(node, "selected", true);

    if (name.startsWith("add-button")) {
      addChildNode(model);
    } else if (name.startsWith("collapse-button")) {
      collapseNode(model);
    } else if (name.startsWith("delete-button")) {
      removeNode(model);
    } else {
      // Check if node ID starts with #
      isReactionNode.value = model.id.startsWith('#');
      
      // Adjust dialog height
      iframeHeight.value = isReactionNode.value ? '400' : '600';
      dialogTitle.value = isReactionNode.value 
        ? `Reaction Step: ${model.id}` 
        : 'Node Information';
      
      if (isReactionNode.value) {
        // Find corresponding reaction step data
        const slideData = dataList.value[currentSlide.value];
        const stepNumber = model.id.replace('#', '');
        const reactionData = slideData.find(item => 
          item.step === `#${stepNumber}` || item.step === stepNumber
        );
        
        // Format condition data
        if (reactionData) {
          currentReactionDetails.value = formatConditionData(
            reactionData.condition,
            reactionData.score
          );
        } else {
          currentReactionDetails.value = [];
        }
      }
      
      // Show dialog
      dialogVisible.value = true;
    }
  });

  // 注册节点状态
  graph.on("node:mouseenter", (evt: any) => {
    const node = evt.item;
    graph.setItemState(node, "hover", true);
  });

  graph.on("node:mouseleave", (evt: any) => {
    const node = evt.item;
    graph.setItemState(node, "hover", false);
  });

  updateTreeData(TreeList.value[currentSlide.value]);
};

const updateTreeData = (data: any) => {
  if (!graph) return;

  graph.clear();
  graph.data(data);
  graph.render();
  graph.fitView();
};

const handleSlideClick = (index: number) => {
  currentSlide.value = index;
  updateTreeData(TreeList.value[index]);

  // 弹出节点信息
  nodeContent.value = [
    `内容 1: ${TreeList.value[index].id}`,
    `内容 2: 详细信息...`
  ];
};

const deleteSlide = (index: number) => {
  if (TreeList.value.length <= 1) return;

  TreeList.value.splice(index, 1);

  if (currentSlide.value >= index) {
    const newIndex = Math.max(0, currentSlide.value - 1);
    currentSlide.value = newIndex;
    updateTreeData(TreeList.value[newIndex]);
  }
};

const handleResize = () => {
  if (graph && container.value) {
    const width = container.value.clientWidth;
    const height = container.value.clientHeight;
    graph.changeSize(width, height);
    graph.fitView();
  }
};

const addChildNode = async (parentNode: any) => {
  const parentSmiles = parentNode.smiles;
  const parentId = parentNode.id;
  // 打印父节点的 smiles（可选）
  var smiles_json = null;
  smiles_json = JSON.stringify({
    smile: parentSmiles,
    tag: tag1.value,
    topk: rank1.value,
    condition: condition1.value,
    flag: 2,
    serve: "single"
  });
  ws_ai.send(smiles_json);
};

const handleTextareaEnter = (row: any) => {
  saveEditing(row);
};

const removeNode = (node: any) => {
  // Function to recursively remove node from tree data by checking children's id
  const removeNodeById = (data: any, targetId: string) => {
    if (!data.children) return false;

    // Find index of child with matching id
    const childIndex = data.children.findIndex((child: any) => child.id === targetId);
    if (childIndex > -1) {
      // Found the node to remove
      const removedNode = data.children[childIndex];
      
      // If this node has children, we need to remove their data too
      if (removedNode.children) {
        removedNode.children.forEach((child: any) => {
          removeDataForNode(child.id);
        });
      }
      
      // Remove the node itself from tree
      data.children.splice(childIndex, 1);
      
      // Remove corresponding data
      removeDataForNode(targetId);
      return true;
    }

    // Recursively check children
    return data.children.some((child: any) => removeNodeById(child, targetId));
  };

  // Helper function to remove data from dataList for a specific node ID
  const removeDataForNode = (nodeId: string) => {
    if (!dataList.value[currentSlide.value]) return;
    console.log(nodeId);
    // Find step number (handle both "#1" and "1" formats)
    const stepNumber = nodeId.startsWith('#') ? nodeId : `#${nodeId}`;
    
    // Filter out matching steps
    dataList.value[currentSlide.value] = dataList.value[currentSlide.value].filter(
      item => item.step !== stepNumber && item.step !== nodeId
    );
  };

  // Remove node from tree structure
  removeNodeById(TreeList.value[currentSlide.value], node.id);
  
  // Update the tree view
  updateTreeData(TreeList.value[currentSlide.value]);
};

const collapseNode = (node: any) => {
  if (node.children && node.children.length > 0) {
    const nodeItem = graph.findById(node.id);
    if (nodeItem) {
      // 切换节点的 collapsed 状态
      node.collapsed = !node.collapsed;
      // 更新树数据
      updateTreeData(TreeList.value[currentSlide.value]);
      // graph.updateItem(nodeItem, { collapsed: node.collapsed });
    }
  }
};

const findRootNode = () => {
  if (!graph) return null;
  // 获取所有节点
  const nodes = graph.getNodes();

  // 遍历节点，找到没有父节点的节点
  for (const node of nodes) {
    const model = node.getModel();
    if (!model.parent) {
      return model.id; // 返回根节点
    }
  }
  return null; // 如果没有找到根节点，返回 null
};

const generateUniqueId = () => {
  const array = new Uint32Array(1); // 创建一个长度为 1 的 32 位无符号整数数组
  crypto.getRandomValues(array); // 填充随机值
  return "Tree" + array[0].toString(36); // 转换为 36 进制字符串
};

const synthesis_analysis = async () => {
  if (!searchQuery.value) {
    ElMessage.info("no input smiles");
    return;
  }
  const smiles = searchQuery.value;
  // 发送数据到 WebSocket
  var smiles_json = null;
  if (activeTab.value == 0) {
    smiles_json = JSON.stringify({
      smile: smiles,
      tag: tag1.value,
      topk: rank1.value,
      condition: condition1.value,
      flag: 1,
      serve: "single"
    });
  } else if (activeTab.value == 1) {
    smiles_json = JSON.stringify({
      smile: smiles,
      tag: tag2.value,
      topk: rank2.value,
      condition: condition2.value,
      flag: 1,
      serve: "multi"
    });
  } else if (activeTab.value == 2) {
    smiles_json = JSON.stringify({
      smile: smiles,
      tag: tag3.value,
      topk: rank3.value,
      condition: condition3.value,
      flag: 1,
      serve: "condition"
    });
  }
  ws_ai.send(smiles_json);
};

async function response1(result) {
  console.log(result)
  var tmpdata = [];
  // 修改第一棵树的 id 和 smiles
  if (TreeList.value.length > 0) {
    TreeList.value[currentSlide.value].id = generateUniqueId(); // 修改 id
    TreeList.value[currentSlide.value].smiles = result.product; // 修改 smiles
  }
  // 处理 reactants，将其转换为嵌套列表
  const nestedReactants = result.reactants.map(reactant => {
    return reactant.split("."); // 以 "." 分割字符串
  });
  TreeList.value[currentSlide.value].children.splice(
    0,
    TreeList.value[0].children.length
  );
  var index = 0;
  nestedReactants.forEach(subArray => {
    const nodes = {
      id: `#${index + 1}`,
      icon: "icon2.png",
      collapsed: false,
      condition:result.condition[index],
      children: subArray.map(smiles => ({
        id: generateUniqueId(),
        icon: "icon2.png",
        smiles: smiles // 直接使用 smiles 字符串
      }))
    };
    TreeList.value[currentSlide.value].children.push(nodes);
    index++;
  });
  console.log(TreeList.value[currentSlide.value])
  updateTeeListIcon();
  updateTreeData(TreeList.value[currentSlide.value]);
  for (let i = 0; i < result.reactants.length; i++) {
    // 获取三个条件，并用换行符连接
    var combinedCondition = "";
    if (result.condition) {
      const condition1 = result.condition[i][0].join(", ");
      const condition2 = result.condition[i][1].join(", ");
      const condition3 = result.condition[i][2].join(", ");
      combinedCondition = `${condition1}\n${condition2}\n${condition3}`;
    }
    const combinedReact = `${result.product}>>${result.reactants[i]}`;

    // 获取模板（如果为空，使用默认值）
    const template = result.template[i] || "";
    tmpdata.push({
      index: i + 1,
      step: `#${i + 1}`,
      score: result.scores[i],
      product: result.product,
      reactant: result.reactants[i],
      condition: combinedCondition, // 使用换行符连接的三个条件
      react: combinedReact, // 合并的反应类型
      template: template
    });
  }
  dataList.value.push(tmpdata);
  //saveTreeListToJson();
}

function extractEdges(tree) {
    const edges = [];

    function traverse(node, parentId) {
        if (parentId) {
            edges.push({ source: parentId, target: node.id });
        }

        if (node.children) {
            node.children.forEach(child => {
                traverse(child, node.id);
            });
        }
    }

    traverse(tree, null);

    return edges;
}

function saveTreeListToJson() {
  // Convert TreeList to JSON string
  const jsonData = JSON.stringify({nodes:graph.save(),edges:extractEdges(graph.save())});
  
  // Create a blob from the JSON data
  const blob = new Blob([jsonData], { type: 'application/json' });
  
  // Create a download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'TreeList.json';
  
  // Trigger the download
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

async function response2(result) {
  // 处理 reactants，将其转换为嵌套列表
  const nestedReactants = result.reactants.map(reactant => {
    return reactant.split("."); // 以 "." 分割字符串
  });

  // 获取当前选中的节点
  const selectedNodes = graph.findAllByState("node", "selected");
  if (selectedNodes.length === 0) {
    console.error("No node is selected.");
    return;
  }

  const selectedNode = selectedNodes[0];
  const selectedNodeModel = selectedNode.getModel();

  // 如果选中的节点没有 children 属性，则初始化一个空数组
  if (!selectedNodeModel.children) {
    selectedNodeModel.children = [];
  }

  // 找到当前最大的index值
  let currentMaxIndex = 0;
  if (dataList.value[currentSlide.value] && dataList.value[currentSlide.value].length > 0) {
    currentMaxIndex = Math.max(...dataList.value[currentSlide.value].map(item => item.index));
  }
  var index = 0;
  // 将嵌套的 reactants 插入到选中的节点的 children 中
  nestedReactants.forEach((subArray, i) => {
    const newNode = {
      id: `#${currentMaxIndex + i + 1}`,
      icon: "icon2.png",
      collapsed: false,
      condition:result.condition[index],
      children: subArray.map(smiles => ({
        id: generateUniqueId(),
        icon: "icon2.png",
        smiles: smiles // 直接使用 smiles 字符串
      }))
    };
    index++;
    selectedNodeModel.children.push(newNode);
  });

  // 更新树数据
  updateTeeListIcon();
  updateTreeData(TreeList.value[currentSlide.value]);

  // 添加新的数据到dataList
  for (let i = 0; i < result.reactants.length; i++) {
    // 获取三个条件，并用换行符连接
    let combinedCondition = "";
    if (result.condition) {
      const condition1 = result.condition[i][0].join(", ");
      const condition2 = result.condition[i][1].join(", ");
      const condition3 = result.condition[i][2].join(", ");
      combinedCondition = `${condition1}\n${condition2}\n${condition3}`;
    }
    const combinedReact = `${result.product}>>${result.reactants[i]}`;

    // 获取模板（如果为空，使用默认值）
    const template = result.template[i] || "";
    
    dataList.value[currentSlide.value].push({
      index: currentMaxIndex + i + 1,
      step: `#${currentMaxIndex + i + 1}`,
      score: result.scores[i],
      product: result.product,
      reactant: result.reactants[i],
      condition: combinedCondition,
      react: combinedReact,
      template: template
    });
  }
}

function insertReactionTree(tree, reactionTree, resultcontion,parentId, index = 0) {
  if (index >= reactionTree.length) return;

  const currentReaction = reactionTree[index];
  const [reactant, _, product] = currentReaction.split(">");
  const product_list = product.split(".");

  const newNode = {
    id: `#${index + 1}`,
    icon: "icon2.png",
    collapsed: false,
    consition:resultcontion[index],
    children: product_list.map(smiles => ({
      id: generateUniqueId(),
      icon: "icon2.png",
      smiles: smiles // 直接使用 smiles 字符串
    }))
  };

  // 将当前节点插入到父节点的 children 中
  const parentNode = findNodeBySmiles(tree, parentId);
  if (!parentNode.children) {
    parentNode.children = [];
  }
  parentNode.children.push(newNode);
  console.log("TreeList", TreeList.value[0]);
  // 递归处理下一个反应步骤
  for (let i = 0; i < product_list.length; i++) {
    insertReactionTree(
      tree,
      reactionTree,
      resultcontion,
      newNode.children[i].smiles,
      index + 1
    );
  }
}

// 辅助函数：根据 id 查找节点
function findNodeBySmiles(tree, smiles) {
  if (tree.smiles === smiles) {
    console.log(tree);
    return tree;
  }
  for (const child of tree.children) {
    const found = findNodeBySmiles(child, smiles);
    if (found) return found;
  }
  return null;
}

function handleMapClick() {
  // Generate new task ID
  addTaskForm.value.id = `TASK-${Math.floor(1000 + Math.random() * 9000)}`;
  addTaskForm.value.createdData = new Date();
  addTaskForm.value.creator = 'ecnuer'
  addTaskForm.value.taskName = "";
  addTaskForm.value.status = 0;

  // Navigate to task page
  //router.push("/task");

  // Show add task dialog after navigation
  nextTick(() => {
    showAddTaskDialog.value = true;
  });
}

async function response3(result) {
  console.log(result);
  // 修改第一棵树的 id 和 smiles
  if (TreeList.value.length > 0) {
    TreeList.value[currentSlide.value].id = generateUniqueId(); // 修改 id
    TreeList.value[currentSlide.value].smiles = result.routes[0].split(">")[0];
  }
  insertReactionTree(
    TreeList.value[currentSlide.value],
    result.routes,
    result.condition,
    TreeList.value[currentSlide.value].smiles,
    0
  );
  console.log(TreeList.value[currentSlide.value].smiles);
  // 更新树数据
  updateTeeListIcon();
  updateTreeData(TreeList.value[currentSlide.value]);
  var tmpdata = [];
  for (let i = 0; i < result.routes.length; i++) {
    // 获取三个条件，并用换行符连接
    var combinedCondition = "";
    if (result.condition) {
      const condition1 = result.condition[i][0].join(", ");
      const condition2 = result.condition[i][1].join(", ");
      const condition3 = result.condition[i][2].join(", ");
      combinedCondition = `${condition1}\n${condition2}\n${condition3}`;
    }
    // 使用正则表达式提取两个>>中间的分数
    const regex = />(\d+\.\d+)>/;
    const scores = result.routes[i].match(regex);
    const score = scores[1];

    const product_smiles = result.routes[i].split(">")[0];

    const parts = result.routes[i].split(">");
    const reactant_smiles = parts[2];
    // 获取模板（如果为空，使用默认值）
    const template = result.templates[i] || "";
    tmpdata.push({
      index: i + 1,
      step: `#${i + 1}`,
      score: score,
      product: product_smiles,
      reactant: reactant_smiles,
      condition: combinedCondition, // 使用换行符连接的三个条件
      react: result.routes[i].replace(/>\d+(\.\d+)?/g, ">"), // 合并的反应类型
      template: template
    });
  }
  dataList.value.push(tmpdata);
}

async function response5(result) {  
  try {
    // 准备跳转到任务页面的数据
    const newTask = {
      ...addTaskForm.value,
      selected: false,
      mapping_result: result  
    };

    // 准备要发送到数据库的数据
    const taskData = {
      name: newTask.taskName,
      create_time: newTask.createdData,
      creator: newTask.creator,
      status: newTask.status,
      graph: JSON.stringify(newTask.mapping_result)
    };
    // 保存 taskData 到文件
    const saveTaskDataToFile = () => {
      const jsonString = JSON.stringify(taskData, null, 2); // 使用缩进格式化 JSON
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task_${newTask.taskName}_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    console.log(taskData)
    // 获取 token
    const tokenInfo = getToken();
    const token = tokenInfo?.accessToken;
    console.log(token);
    // 发送数据到数据库
    const myHeaders = new Headers();
    myHeaders.append("token", token);
    myHeaders.append("User-Agent", "Apifox/1.0.0 (https://apifox.com)");
    myHeaders.append("Accept", "*/*");
    myHeaders.append("Connection", "keep-alive");
    myHeaders.append("Content-Type", "application/json");

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify(taskData),
      redirect: 'follow' as RequestRedirect
    };

    const response = await fetch("/api/tasks", requestOptions);
    const responseData = await response.text();
    console.log('数据库存储响应:', responseData);

    if (responseData) {
      console.log('数据库存储响应:', responseData);
      // 使用 replace 替代 push，并等待跳转完成
      await router.replace("/task");
      // 强制刷新当前路由
      window.location.reload();
    } else {
      throw new Error('保存数据失败');
    }
  } catch (error) {
    console.error('存储数据到数据库时出错:', error);
    ElMessage.error('存储数据到数据库失败，请重试');
  }
}

const showSlideDetails = (index: number) => {
  currentSlideDetails.value = dataList.value[index];
  showDetailsDialog.value = true;
};

const handleclick = () => {
  // 处理标签页点击事件
  console.log("Tab clicked:", activeTab.value);
};

// 添加新的处理函数
const processImage = (img: any) => {
  try {
    // 如果输入是 Blob 类型
    if (img instanceof Blob) {
      return URL.createObjectURL(img);
    }

    // 如果输入是字符串类型
    if (typeof img === "string") {
      // 如果已经是 data URL 格式，直接返回
      if (img.startsWith("data:")) {
        return img;
      }

      // 处理 SVG 字符串内容
      const blob = new Blob([img], { type: "image/svg+xml" });
      return URL.createObjectURL(blob);
    }

    // 如果是其他类型，尝试转换为字符串
    const imgString = String(img);
    const blob = new Blob([imgString], { type: "image/svg+xml" });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error processing image:", error);
    return img;
  }
};

const updateNodeImage = async (nodeId: string, smiles: string) => {
  try {
    // 使用 ketcherInstance 生成图像
    const img = await ketcherInstance.generateImage(smiles, {
      outputFormat: "svg",
      backgroundColor: "255, 255, 255"
    });

    // 找到对应节点并更新其图像
    const node = graph.findById(nodeId);
    if (node) {
      // 更新节点数据
      const model = node.getModel();
      const processedImg = processImage(img);
      model.icon = processedImg;
      // 更新视图
      graph.updateItem(node, {
        icon: processedImg,
        smiles: smiles
      });
    }
  } catch (error) {
    console.error("Error updating node image:", error);
  }
};

// 递归处理树节点的函数
const processTreeNode = async (node: any) => {
  try {
    // 如果节点有 smiles，生成图像
    if (node.smiles) {
      const img = await ketcherInstance.generateImage(node.smiles, {
        outputFormat: "svg",
        backgroundColor: "255, 255, 255"
      });
      node.icon = processImage(img);
    }

    // 递归处理子节点
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        await processTreeNode(child);
      }
    }
  } catch (error) {
    console.error("Error processing tree node:", error);
  }
};

const updateTeeListIcon = async () => {
  try {
    // 遍历每个树
    for (const tree of TreeList.value) {
      await processTreeNode(tree);
    }

    // 更新视图
    if (graph) {
      graph.changeData(TreeList.value[currentSlide.value]);
      graph.fitView();
    }
  } catch (error) {
    console.error("Error updating tree list icons:", error);
  }
};

const resetAddTaskForm = () => {
  addTaskFormRef.value?.resetFields();
  addTaskForm.value = {
    id: `TASK-${Math.floor(1000 + Math.random() * 9000)}`,
    createdData: new Date(),
    creator: 'ecnuer',
    taskName: '',
    status: 0
  };
};


const confirmAddTask = () => {
  addTaskFormRef.value.validate(async (valid) => { // 将回调函数标记为 async
    if (valid) {
      try {
        //saveTreeListToJson()
        // 动态读取 JSON 文件
        
        const data_H = await fetch("/src/views/synthesis/data/canvasData.json").then(res => res.json());
        const data_G = {nodes:graph.save(),edges:extractEdges(graph.save())};
        console.log(data_G)
        ws_ai.send(JSON.stringify({data_H:data_H["data"],data_G:data_G,'serve':'graph',
        task:{'name':addTaskForm.value.taskName,'time':addTaskForm.value.createdData,'note':addTaskForm.value.creator}}));
      } catch (error) {
        console.error("Error loading JSON files:", error);
      }
    }
  });
};


onMounted(async () => {
  await updateTeeListIcon();
  initTree();
  window.addEventListener("resize", handleResize);
  ws_ai.onopen = function () {
    // Web Socket 已连接上，使用 send() 方法发送数据
    console.log("webSocket with ai opening...");
    //ws_ai.send("SMILES is coming");
  };
  //处理接收到的信息
  ws_ai.onmessage = async function (evt) {
    var result = JSON.parse(evt.data);
    var flag = result.flag;
    var serve = result.serve;
    switch (serve) {
      case "single":
        if (flag === 1) {
          response1(result);
        } else {
          response2(result);
        }
        break;
      case "multi":
        if (flag === 1) {
          response3(result);
        } else {
          console.log(result);
          response2(result);
        }
        break;
      case 'graph':
        delete result.serve; 
        response5(result);
        break;
      default:
        response4(result);
        console.log(result);
    }
  };

  ws_ai.onerror = function (evt: Event) {
    const error = (evt as ErrorEvent).error;
    console.log("websocket error:" + error);
  };

  ws_ai.onclose = function () {
    // 关闭 websocket
    console.log("连接ai已关闭...");
  };
});

onBeforeUnmount(() => {
  // try {
  //   if (graph) {
  //     graph.destroy();
  //   }
  //   window.removeEventListener("resize", handleResize);
  //   console.log(graph,'======graph');
  //   // 清理所有通过 URL.createObjectURL 创建的 URL
  //   const nodes = graph?.getNodes() || [];
  //   console.log(nodes,'====nodes');
  //   nodes?.forEach(node => {
  //     const model = node.getModel();
  //     if (model.icon && model.icon.startsWith("blob:")) {
  //       URL.revokeObjectURL(model.icon);
  //     }
  //   });
  // } catch (error) {
  //   console.log(error,'===error');
  // }
});
</script>

<style scoped>
.synthesis-page {
  height: 100%;
}
.table-content {
  height: 500px;
  overflow-y: auto;
}
.node-content-list {
  height: 500px;
  overflow-y: auto;
}
.synthesis-container {
  box-sizing: border-box;
  display: flex;

  /* width: 100%; */
  column-gap: 10px;

  /* height: 100%; */
  height: calc(100% - 60px);
  overflow-y: auto;
}
.left-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.content-layout {
  flex: 1;
  height: 100%;

  border: 1px solid #e8e8e8;
  border-radius: 4px;
  display: flex;
  column-gap: 10px;
}

.graph-container {
  background: #fff;
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
}

.slides-container {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;

  /* width: 240px; */
  width: 240px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e8e8e8;
}

.slides-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.slides-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #1f2329;
}

.slides-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s;
  position: relative;
  z-index: 1;
}

.action-icon {
  padding: 4px;
  font-size: 18px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.view-icon {
  color: #409eff;
}

.view-icon:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.delete-icon {
  color: #f56c6c;
}

.delete-icon:hover {
  background-color: rgba(245, 108, 108, 0.1);
}

.slides-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.slide-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  transition: all 0.3s;
}

.slide-content {
  display: flex;
  gap: 12px;
  align-items: center;
}

.slide-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 14px;
  color: #666;
  background: #f5f5f5;
  border-radius: 12px;
}

.slide-name {
  font-size: 14px;
  color: #1f2329;
}

.slide-item:hover .slide-actions {
  opacity: 1;
}

.slide-item:hover {
  background: #f5f5f5;
  border-color: #d9d9d9;
}

.slide-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

/* 自定义滚动条样式 */
.slides-list::-webkit-scrollbar {
  width: 6px;
}

.slides-list::-webkit-scrollbar-thumb {
  background: #e8e8e8;
  border-radius: 3px;
}

.slides-list::-webkit-scrollbar-track {
  background: transparent;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.menu-item:hover {
  background: #f5f5f5;
}

.search-container {
  display: flex;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #e8e8e8;
  /* border-radius: 20px; */
  margin-right: 8px;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.search-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 5px rgba(24, 144, 255, 0.5);
  outline: none;
}

.search-button {
  padding: 10px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition:
    background-color 0.3s,
    transform 0.3s;
}

.search-button:hover {
  background-color: #40a9ff;
  transform: translateY(-2px);
}

.upload-button {
  margin-left: 5px;
  padding: 10px 16px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition:
    background-color 0.3s,
    transform 0.3s;
}

.upload-button:hover {
  background-color: #45a049;
  transform: translateY(-2px);
}

.configures {
  padding: 10px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background: #fff;
}

.config-item {
  margin-bottom: 20px;
}

.title {
  font-weight: bold;
  margin-bottom: 5px;
}

.molecule {
  padding: 10px;
}
.dialog-custom-class ::v-deep .el-dialog__header {
  padding: 0;
}
.dialog-custom-class ::v-deep .el-dialog__body {
  padding: 10px;
}

.map-controls {
  margin: 12px 0;
  display: flex;
  justify-content: flex-end;
}

.map-button {
  padding: 8px 15px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.map-button .el-icon {
  font-size: 16px;
}

.dialog-content-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.molecule {
  width: 100%;
  min-height: 400px;
}

.reaction-table-container {
  margin-top: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
}

.reaction-table-container h4 {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 16px;
  font-weight: 500;
}

.reaction-table-container ::v-deep .el-table {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.reaction-table-container ::v-deep .el-table__body-wrapper {
  max-height: 250px;
  overflow-y: auto;
}

.el-textarea__inner {
  width: 100%;
  padding: 5px;
  border: 1px solid #409eff;
  border-radius: 4px;
  box-shadow: 0 0 5px rgba(64, 158, 255, 0.5);
}
</style>
