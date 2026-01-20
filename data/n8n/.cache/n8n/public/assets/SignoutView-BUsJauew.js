import { D as createElementBlock, P as defineComponent, Z as onMounted, et as openBlock } from "./vue.runtime.esm-bundler-tP5dCd7J.js";
import { _t as useI18n } from "./_MapCache-ficiegRb.js";
import { y as useRouter } from "./truncate-B1HVeveJ.js";
import { Dr as useUsersStore, v as useToast } from "./builder.store-CgMqPgnW.js";
import "./empty-BUjCyq3U.js";
import { Bo as VIEWS } from "./constants-B5yiZflE.js";
import "./merge-DjI8TA-7.js";
import "./_baseOrderBy-DwurmLcj.js";
import "./dateformat-BlfbK1ki.js";
import "./useDebounce-BjcMkTu4.js";
var SignoutView_default = /* @__PURE__ */ defineComponent({
	__name: "SignoutView",
	setup(__props) {
		const usersStore = useUsersStore();
		const toast = useToast();
		const router = useRouter();
		const i18n = useI18n();
		const logout = async () => {
			try {
				await usersStore.logout();
				window.location.href = router.resolve({ name: VIEWS.SIGNIN }).href;
			} catch (e) {
				toast.showError(e, i18n.baseText("auth.signout.error"));
			}
		};
		onMounted(() => {
			logout();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div");
		};
	}
});
export { SignoutView_default as default };
