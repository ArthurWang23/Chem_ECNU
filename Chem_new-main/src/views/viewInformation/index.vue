<template>
  <div class="main-container">
    <!-- G6 画布容器 -->
    <div
      ref="container"
      class="graph-container"
      :class="{
        'graph-container-full': !isSidebarOpen,
        'graph-container-collapsed': !appSidebarOpened && isSidebarOpen
      }"
    />
    <div v-if="loading" class="loading-message">Loading graph data...</div>
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { Graph } from "@antv/g6";
import { useAppStoreHook } from "@/store/modules/app";

// SVG imports
import pump from "@/assets/svg/pump.svg?url";
import valve from "@/assets/svg/valve.svg?url";
import chip from "@/assets/svg/chip.svg?url";
import mfc from "@/assets/svg/mfc.svg?url";
import light from "@/assets/svg/light.svg?url";
import bottle from "@/assets/svg/bottle.svg?url";

// Store
const appStore = useAppStoreHook();
const isSidebarOpen = computed(() => appStore.sidebar.opened);
const appSidebarOpened = computed(() => appStore.sidebar.opened);

// Graph container ref
const container = ref(null);
const loading = ref(false);
const errorMessage = ref("");
let graph = null;

// Load graph data from local JSON file
const loadGraphData = async (mapping_data) => {
  try {
    loading.value = true;
    errorMessage.value = "";
    
    const pathConfig = JSON.parse(mapping_data);
    console.log(pathConfig)
    if (!pathConfig.nodes || !pathConfig.links) {
      throw new Error("Incorrect JSON data format, missing data field");
    }
    
    initGraph(pathConfig);
  } catch (error) {
    console.error("Failed to load graph data:", error);
    errorMessage.value = `Failed to load graph data: ${error.message}`;
  } finally {
    loading.value = false;
  }
};

// Initialize graph with loaded data
const initGraph = (pathConfig) => {
  if (!container.value) {
    errorMessage.value = "Graph container not found";
    return;
  }

  const containerEl = container.value;
  const graphWidth = containerEl.clientWidth || 800;
  const graphHeight = containerEl.clientHeight || 600;

  // Destroy old graph if exists
  if (graph) {
    graph.destroy();
  }

  // Create new graph
  graph = new Graph({
    container: containerEl,
    width: graphWidth,
    height: graphHeight,
    modes: {
      default: ['drag-canvas', 'zoom-canvas']
    },
    fitView: true,  // 启用自动适应视图
    fitViewPadding: [20, 40, 20, 40],  // 设置适应视图时的内边距
    node: {
      style: {
        fill: '#91d5ff',
        stroke: '#40a9ff',
        lineWidth: 1,
        radius: 6
      }
    },
    edge: {
    }
  });

  // Process nodes
  const nodesData = [];
  if (pathConfig.nodes?.length) {
    pathConfig.nodes.forEach(node => {
      if (!node.id) return;
      
      const processedNode = {
        id: node.id,
        type: "image",
        data: {
          deviceType: node.data?.deviceType || node.id.split('-')[0] || 'unknown',
          label: node.data?.label || "Device"
        },
        style: {
          x: node.style?.x || 100 + Math.random() * 300,
          y: node.style?.y || 100 + Math.random() * 200,
          size: node.style?.size || [40, 40],
          label: node.style?.label || `Device (${node.id})`,
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

      // Set icons
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

  // Process edges
  const edgesData = [];
  if (pathConfig.links?.length) {
    pathConfig.links.forEach(edge => {
      if (!edge.source || !edge.target) return;
      
      // 确保正确处理stroke颜色
      const edgeColor = edge.style?.stroke && 
                      (edge.style.stroke.toUpperCase() === "#FFA500" || 
                        edge.style.stroke.toUpperCase() === "ORANGE") 
                      ? '#FFA500' 
                      : '#91d5ff';
      console.log(edgeColor)
      edgesData.push({
        source: edge.source,
        target: edge.target,
        style: {
          stroke: edgeColor,
          lineWidth: 2,
          endArrow: {
            fill: edgeColor,
            stroke: edgeColor
          }
        }
      });
    });
  }

  // Add data to graph
  if (nodesData.length) graph.addNodeData(nodesData);
  if (edgesData.length) graph.addEdgeData(edgesData);

  // Render graph
  graph.render();
 
  // Fit view with padding and animation
  if (nodesData.length) {
    graph.fitView({
      padding: [20, 40, 20, 40],  // 上、右、下、左
      animate: true
    });
    
    // 如果需要进一步缩小，可以设置缩放比例
    setTimeout(() => {
      graph.zoomTo(0.8, { duration: 500 });  // 缩小到80%
    }, 100);
  }
};

// 监听容器大小变化
const resizeObserver = new ResizeObserver(() => {
  if (graph) {
    graph.fitView({
      padding: [20, 40, 20, 40],
      animate: true
    });
  }
});

onMounted(() => {
  if (container.value) {
    resizeObserver.observe(container.value);
  }
});

onBeforeUnmount(() => {
  if (graph) {
    graph.destroy();
  }
  resizeObserver.disconnect();
});

window.addEventListener('message', (event) => {
  console.log('Received message:', event); // 先打印全部信息调试

  if (event.data && event.data.type === 'ROW_DATA') {
    console.log('Received row data:', event.data.data);
    // 在这里处理接收到的行数据
    loadGraphData(event.data.data)
  }
});
</script>

<style scoped>
.main-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.graph-container {
  width: 100%;
  height: 100%;
  transition: all 0.3s;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.graph-container-full {
  width: 100%;
}

.graph-container-collapsed {
  width: calc(100% - var(--sidebar-width));
}

.loading-message, .error-message {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  z-index: 1000;
}

.error-message {
  background-color: rgba(255, 0, 0, 0.7);
}
</style>