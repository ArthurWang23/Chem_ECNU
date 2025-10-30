import { reactive } from "vue";
import type { FormRules } from "element-plus";

/** Login validation */
const loginRules = reactive(<FormRules>{
  username: [
    {
      required: true,
      message: "Please enter username",
      trigger: "blur"
    }
  ],
  password: [
    {
      required: true,
      message: "Please enter password",
      trigger: "blur"
    }
  ]
});

export { loginRules };