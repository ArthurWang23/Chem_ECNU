<script setup lang="ts">
import { hasAuth, getAuths } from "@/router/utils";

defineOptions({
  name: "PermissionButtonRouter"
});
</script>

<template>
  <div>
    <p class="mb-2">Current code list: {{ getAuths() }}</p>

    <el-card shadow="never" class="mb-2">
      <template #header>
        <div class="card-header">Component-based permission check</div>
      </template>
      <el-space wrap>
        <Auth value="permission:btn:add">
          <el-button plain type="warning">
            Has code: 'permission:btn:add' permission visible
          </el-button>
        </Auth>
        <Auth :value="['permission:btn:edit']">
          <el-button plain type="primary">
            Has code: ['permission:btn:edit'] permission visible
          </el-button>
        </Auth>
        <Auth
          :value="[
            'permission:btn:add',
            'permission:btn:edit',
            'permission:btn:delete'
          ]"
        >
          <el-button plain type="danger">
            Has code: ['permission:btn:add', 'permission:btn:edit',
            'permission:btn:delete'] permission visible
          </el-button>
        </Auth>
      </el-space>
    </el-card>

    <el-card shadow="never" class="mb-2">
      <template #header>
        <div class="card-header">Function-based permission check</div>
      </template>
      <el-space wrap>
        <el-button v-if="hasAuth('permission:btn:add')" plain type="warning">
          Has code: 'permission:btn:add' permission visible
        </el-button>
        <el-button v-if="hasAuth(['permission:btn:edit'])" plain type="primary">
          Has code: ['permission:btn:edit'] permission visible
        </el-button>
        <el-button
          v-if="
            hasAuth([
              'permission:btn:add',
              'permission:btn:edit',
              'permission:btn:delete'
            ])
          "
          plain
          type="danger"
        >
          Has code: ['permission:btn:add', 'permission:btn:edit',
          'permission:btn:delete'] permission visible
        </el-button>
      </el-space>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          Directive-based permission check (cannot dynamically modify permissions)
        </div>
      </template>
      <el-space wrap>
        <el-button v-auth="'permission:btn:add'" plain type="warning">
          Has code: 'permission:btn:add' permission visible
        </el-button>
        <el-button v-auth="['permission:btn:edit']" plain type="primary">
          Has code: ['permission:btn:edit'] permission visible
        </el-button>
        <el-button
          v-auth="[
            'permission:btn:add',
            'permission:btn:edit',
            'permission:btn:delete'
          ]"
          plain
          type="danger"
        >
          Has code: ['permission:btn:add', 'permission:btn:edit',
          'permission:btn:delete'] permission visible
        </el-button>
      </el-space>
    </el-card>
  </div>
</template>
