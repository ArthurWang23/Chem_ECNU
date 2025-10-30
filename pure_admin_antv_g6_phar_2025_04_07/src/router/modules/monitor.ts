// Device monitoring route
export default {
  path: "/monitor",
  redirect: "/monitor/index",
  meta: {
    icon: "Monitor", // Icon
    title: "Device Monitor", // Menu title
    rank: 4 // Sort order, ensure proper position in menu
  },
  children: [
    {
      path: "/monitor/index",
      name: "Monitor",
      component: () => import("@/views/monitor/index.vue"),
      meta: {
        title: "Monitor", // Page title
        keepAlive: true, // ✅ Enable page caching
        showLink: true
      }
    }
  ]
};