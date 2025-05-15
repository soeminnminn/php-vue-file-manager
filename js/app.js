import { h } from 'vue';
import AsyncLoader from './components/async-loader.js';
import Navbar from './components/nav-bar.js';
import Sidebar from './components/sidebar.js';
import SplitPane, { Pane } from './components/splitpanes.js';
import UploadContext from './components/upload-context.js';
import ContentView from './components/content-view.js';
import ProgressPanel from './components/progress-panel.js';
import NewFolderDialog from './components/new-folder-dialog.js';
import { ONotificationsContainer } from './lib/notifications/index.js';
import * as utils from './lib/utils.js';

export default {
  name: 'app',
  components: {
    AsyncLoader,
    Navbar,
    Sidebar,
    SplitPane,
    Pane,
    UploadContext,
    ContentView,
    ProgressPanel,
    ONotificationsContainer,
    NewFolderDialog,
  },
  props: {
    xsrf: {
      type: String,
      required: true,
    },
    apiUrl: {
      type: String,
      required: true,
    },
  },
  provide() {
    return {
      getXSRF: () => this.xsrf,
      getApiUrl: () => this.apiUrl,
      getCurrentDir: () => this.currentDir,
      fetchApi: this.fetchApi,
      uploadFile: this.uploadFile,
    };
  },
  data() {
    return {
      currentDir: '/',
      listResults: [],
      isWritable: false,
      executableList: [],
      sortBy: 'name',
      viewMode: 'headline',
      openNewFolderDlg: false,
    };
  },
  mounted() {
    window.addEventListener('hashchange', this.handleHashChange);
    this.$nextTick(this.handleHashChange);
  },
  beforeUnmount() {
    window.removeEventListener('hashchange', this.handleHashChange);
  },
  methods: {
    async fetchApi(method, cmd, file, name) {
      file = file || this.currentDir;

      method = ['get', 'post'].includes(method) ? method : 'get';

      const url = new URL(this.apiUrl);
      let body = undefined;
      if (method == 'get') {
        url.searchParams.append('do', cmd);
        if (file) url.searchParams.append('file', file);
        if (name) url.searchParams.append('name', name);

      } else {
        body = new FormData();
        body.append('do', cmd);
        body.append('xsrf', this.xsrf);
        
        if (file) body.append('file', file);
        if (name) body.append('name', name);
      }

      const res = await fetch(url, {
        method,
        body,
      });

      if (res) {
        return await res.json();
      }

      return null;
    },
    async loadList(dir) {
      return await this.fetchApi('get', 'list', dir);
    },
    refreshList() {
      if (!this.$refs.loader) return;

      this.$refs.loader.loadData(this.currentDir)
        .then((json) => {
          if (json.success) {
            this.isWritable = json.isWritable;
            this.listResults = (json.results || []);
            this.executableList = this.listResults.filter(x => !!x.executableFile).sort(utils.filelistComparator('name'));

          } else if (json.error) {
            console.dir(json);
          }
        }).catch((e) => {
          console.error(e);
        });
    },
    async uploadFile(file) {
      const url = new URL(this.apiUrl);
      const dir = this.currentDir;

      try {
        await utils.uploadFile(url, {
          'do': 'upload',
          'file_data': file,
          'file': dir,
          'xsrf': this.xsrf,
        }, (progress) => {
          console.log('Upload >>', progress, file.name);
        });

        this.refreshList();

        this.$notifications.open(`"${file.name}" uploaded`, {
          title: this.$t('APP_NAME'),
          icon: 'success',
          type: 'success',
        });
      } catch (e) {
        console.error(e);
      }
    },
    handleHashChange() {
      this.currentDir = '.' + (window.location.hash || '#/').slice(1);
      this.refreshList();
    },
    handleViewChange(view) {
      this.viewMode = view;
    },
    handleSortMenuItemClick(item) {
      this.sortBy = item;
    },
    handleMoreMenuItemClick(item) {
      if (item == 'newFolder') {
        this.openNewFolderDlg = true;
      }
    },
    handleOpenFolder(props) {
      window.location.hash = `#/${props.row.path}`;
    },
  },
  render() {
    return [
      h(Navbar, {
        currentDir: this.currentDir,
        isWritable: this.isWritable,
        sort: this.sortBy,
        onReloadClick: () => this.refreshList(),
        onViewChange: this.handleViewChange,
        onSortItemClick: this.handleSortMenuItemClick,
        onMoreItemClick: this.handleMoreMenuItemClick,
      }),
      h(AsyncLoader, { ref: 'loader', loadOnStart: false, promise: this.loadList }),
      h('div', { class: 'main' },
        h(SplitPane, {}, () => [
          h(Pane, { minSize: 12 }, () => h(Sidebar, { executableList: this.executableList })),
          h(Pane, { minSize: 40, size: 85 }, () => h(UploadContext, { 
            className: 'content-pane',
          }, () => [
            h(ContentView, {
              items: this.listResults,
              sort: this.sortBy,
              view: this.viewMode,
              isWritable: this.isWritable,
              onOpenFolder: this.handleOpenFolder
            }),
            h(ProgressPanel, { ref: 'progressPanel' }),
          ])),
        ])
      ),
      h(NewFolderDialog, { 
        open: this.openNewFolderDlg, 
        onShow: (val) => { this.openNewFolderDlg = val; }, 
        onSubmited: () => this.refreshList() 
      }),
      h(ONotificationsContainer, { position: 'top-center' }),
    ];
  }
}