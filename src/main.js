import plugin from "../plugin.json"

const selectInstance = { i: false, tag: null };
const editor = editorManager.editor;
let session;
const gti = ace.require("ace/token_iterator").TokenIterator;
let ti;

function handle(e) {
    session = editor.session;
    const c = session.getValue();
    const cp = editor.getCursorPosition();
    const mainRow = c.split("\n")[e.start.row];
    let oldTagName;
    if (!selectInstance.tag) {
        const originalState = getprev(mainRow, e);
        if (!originalState) return;
        oldTagName = extractTag(originalState, cp);
        if (e.action == "remove" && oldTagName.length == e.lines[0].length) {
            const col = e.start.column;
            const mTxt = mainRow.slice(col - 1, col + 1);
            if (mTxt == "<>" || mTxt == "< ") {
                selectInstance.i = e;
                selectInstance.tag = oldTagName;
                return;
            }
        }
    } else {
        if (
            e.action == "insert" &&
            selectInstance.i.start.row == cp.row &&
            (selectInstance.i.start.column + e.lines[0].length - 1 ==
                cp.column ||
                cp.column == selectInstance.i.start.column)
        ) {
            oldTagName = selectInstance.tag;
            selectInstance.i = false;
            selectInstance.tag = null;
        } else {
            const originalState = getprev(mainRow, e);
            if (!originalState) return;
            oldTagName = extractTag(originalState, cp);
        }
    }
    ti = new gti(session, cp.row, cp.column);
    let mainToken = ti.getCurrentToken();
    if (!mainToken) {
        return;
    }
    if (!mainToken.type.includes("tag-name")) {
        if (mainToken.type.includes("tag-open")) {
            ti.stepForward();
        } else if (
            mainToken.type.includes("tag-whitespace") ||
            mainToken.type.includes("tag-close")
        ) {
            ti.stepBackward();
        } else {
            return;
        }
        mainToken = ti.getCurrentToken();
        if (!mainToken.type.includes("tag-name")) {
            return;
        }
    }
    ti.stepBackward();
    if (ti.getCurrentToken().type.includes("close-tag-open")) {
        return;
    }
    ti.stepForward();
    let newTagName = mainToken.value;
    if (newTagName == oldTagName) {
        return;
    }
    while (ti.stepForward()) {
        const ct = ti.getCurrentToken();
        if (ct.type.includes("tag-name") && ct.value == oldTagName) {
            ti.stepBackward();
            const nestToken = ti.getCurrentToken();
            if (nestToken.value == "<") {
                const pos = ti.getCurrentTokenPosition();
                const tags = session.getMatchingTags(pos);
                if (!tags) return;
                ti = new gti(
                    session,
                    tags.closeTag.end.row,
                    tags.closeTag.end.column
                );
            } else if (nestToken.value == "</") {
                ti.stepForward();
                session.replace(ti.getCurrentTokenRange(), newTagName, "end");
                break;
            }
        }
    }
}

function getprev(mrow, e) {
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

function extractTag(row, cp) {
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

if (window.acode) {
    acode.setPluginInit(plugin.id, () => {
        editor.on("change", handle)
    });
    acode.setPluginUnmount(plugin.id, () => {
        editor.off("change", handle)
    });
}
