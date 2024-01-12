import plugin from '../plugin.json';

class AutoRenameTagPlugin {
  constructor() {
    this.editor = null;
    this.file = null;
  }

  async init($page) {
    this.editor = $page.editor;
    this.file = $page.file;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.editor.onDidChangeContent((event) => this.handleContentChange(event));
  }

  async destroy() {
    this.removeEventListeners();
  }

  removeEventListeners() {
    this.editor.offDidChangeContent(this.handleContentChange);
  }

  handleContentChange(event) {
    if (!this.isHtmlOrEjsFile()) {
      return;
    }

    const { range, newText } = event;
    const match = newText.match(/<(\w+)[^>]*>/);
    if (match) {
      const openingTag = match[0];
      const tagName = match[1];
      const closingTag = </${tagName}>;

      this.editor.edit((editBuilder) => {
        editBuilder.replace(range.end, closingTag);
      });
    }
  }

  isHtmlOrEjsFile() {
    const fileType = this.file.type.toLowerCase();
    return fileType === 'html' || fileType === 'ejs';
  }
}

if (window.acode) {
  const autoRenameTagPlugin = new AutoRenameTagPlugin();

  acode.setPluginInit(plugin.id, async ($page) => {
    await autoRenameTagPlugin.init($page);
  });

  acode.setPluginUnmount(plugin.id, () => {
    autoRenameTagPlugin.destroy();
  });
}
