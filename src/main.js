import plugin from '../plugin.json';

class TechnoART {
    constructor() {
        this.editor = null;
        this.session = null;
        this.selectInstance = { i: false, tag: null };
    }

    async init() {
        this.editor = editorManager.editor;
        this.session = this.editor.session;
        this.gti = ace.require("ace/token_iterator").TokenIterator;
        this.editor.on("change", this.mainFunc);
    }
    
    async destroy() {
        this.editor.off("change", this.mainFunc);
    }
    
    mainFunc(e) {
        this.handle(e)
    }
    
    handle(e) {
        const c = this.session.getValue()
        const cp = this.editor.getCursorPosition()
        const mainRow = c.split("\n")[e.start.row];
        let oldTagName;
        if (!this.selectInstance.tag) {
            const originalState = this.getprev(mainRow, e);
            if (!originalState) return;
            oldTagName = this.extractTag(originalState, cp);
            if (
                e.action == "remove" &&
                oldTagName.length == e.lines[0].length
            ) {
                const col = e.start.column;
                const mTxt = mainRow.slice(col - 1, col + 1);
                if (mTxt == "<>" || mTxt == "< ") {
                    this.selectInstance.i = e;
                    this.selectInstance.tag = oldTagName;
                    return;
                }
            }
        } else {
            if (
                e.action == "insert" &&
                this.selectInstance.i.start.row == cp.row &&
                (this.selectInstance.i.start.column + e.lines[0].length - 1 ==
                    cp.column ||
                    cp.column == this.selectInstance.i.start.column)
            ) {
                oldTagName = this.selectInstance.tag;
                this.selectInstance.i = false;
                this.selectInstance.tag = null;
            } else {
                const originalState = this.getprev(mainRow, e);
                if (!originalState) return;
                oldTagName = this.extractTag(originalState, cp);
            }
        }
        this.ti = new this.gti(this.session, cp.row, cp.column);
        let mainToken = this.ti.getCurrentToken();
        if (!mainToken) {
            return;
        }
        if (!mainToken.type.includes("tag-name")) {
            if (mainToken.type.includes("tag-open")) {
                this.ti.stepForward();
            } else if (
                mainToken.type.includes("tag-whitespace") ||
                mainToken.type.includes("tag-close")
            ) {
                this.ti.stepBackward();
            } else {
                return;
            }
            mainToken = this.ti.getCurrentToken();
            if (!mainToken.type.includes("tag-name")) {
                return;
            }
        }
        this.ti.stepBackward();
        if (this.ti.getCurrentToken().type.includes("close-tag-open")) {
            return;
        }
        this.ti.stepForward();
        let newTagName = mainToken.value;
        if (newTagName == oldTagName) {
            return;
        }
        while (this.ti.stepForward()) {
            const ct = this.ti.getCurrentToken();
            if (ct.type.includes("tag-name") && ct.value == oldTagName) {
                this.ti.stepBackward();
                const nestToken = this.ti.getCurrentToken();
                if (nestToken.value == "<") {
                    const pos = this.ti.getCurrentTokenPosition();
                    const tags = this.session.getMatchingTags(pos);
                    if (!tags) return;
                    this.ti = new this.gti(
                        this.session,
                        tags.closeTag.end.row,
                        tags.closeTag.end.column
                    );
                } else if (nestToken.value == "</") {
                    this.ti.stepForward();
                    this.session.replace(
                        this.ti.getCurrentTokenRange(),
                        newTagName,
                        "end"
                    );
                    break;
                }
            }
        }
    }

    getprev(mrow, e) {
        if (!mrow || !e) return;
        if (e.lines.length > 1) return;
        switch (e.action) {
            case "insert":
                mrow =
                    mrow.slice(0, e.start.column) +
                    mrow.slice(e.end.column, mrow.length);
                return mrow;
                break;

            case "remove":
                mrow =
                    mrow.slice(0, e.start.column) +
                    e.lines[0] +
                    mrow.slice(e.start.column, mrow.length);
                return mrow;
                break;
        }
    }

    extractTag(row, cp) {
        let openCol;
        let TagName = "";
        let start_index = 0;
        let openTagsCount;

        for (let n = cp.column; n >= 0; n--) {
            if (row[n] == "<") {
                openCol = n;
                start_index = n;
                break;
            }
        }

        if (openCol == 0 || Number(openCol)) {
            for (let i = openCol + 1; i < row.length; i++) {
                if (row[i] == " ") break;
                if (row[i] == ">") break;
                !TagName ? (TagName = row[i]) : (TagName += row[i]);
            }
        }
        return TagName;
    }
}


if (window.acode) {
  const technoPlugin = new TechnoART();
  acode.setPluginInit(plugin.id, async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    technoPlugin.baseUrl = baseUrl;
    await technoPlugin.init();
  });
  acode.setPluginUnmount(plugin.id, () => {
    acodePlugin.destroy();
  });
}
