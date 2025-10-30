const Layout = () => import("@/layout/index.vue");

export default [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: {
      title: "Login",
      showLink: false,
      rank: 101
    }
  },
  {
    path: "/monitor-standalone",
    name: "MonitorStandalone",
    component: () => import("@/views/monitor-standalone/index.vue"),
    meta: {
      title: "Hardware Monitor"
    }
  },
  {
    path: "/topcontrol/index",
    name: "Topcontrol",
    component: () => import("@/views/topcontrol/index.vue"),
    meta: {
      title: "Structure Control 2"
    }
  },
  {
    path: "/viewInformation/index",
    name: "viewInformation",
    component: () => import("@/views/viewInformation/index.vue"),
    meta: {
      title: "View Interface"
    }
  },
  {
    path: "/redirect",
    component: Layout,
    meta: {
      title: "Loading...",
      showLink: false,
      rank: 102
    },
    children: [
      {
        path: "/redirect/:path(.*)",
        name: "Redirect",
        component: () => import("@/layout/redirect.vue")
      }
    ]
  }
] satisfies Array<RouteConfigsTable>;