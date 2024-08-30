function init(ref) {
    ref.exc('load(Univers)', { Univers }, () => {
        const { props } = ref
        if (parseInt(getComputedStyle(ref.container).height) < 200) ref.container.style.height = "400px"
        if (!props.path) ref.isDev ? warn("请配置数据路径") : ""
        let D = ref.excA(props.path.startsWith("$c.x") ? props.path : "$c.x." + props.path)
        if (!D || !D.all) {
            ref.retry = (ref.retry || 0) + 1
            return ref.retry < 20 ? setTimeout(() => init(ref), 200) : warn("没有数据")
        } else if (ref.U) {
            ref.U.dispose()
        }

        let U = new window.UniverCore.Univer({ theme: window.UniverDesign.defaultTheme })
        U.registerPlugin(window.UniverDocs.UniverDocsPlugin, { hasScroll: false })
        U.registerPlugin(window.UniverEngineRender.UniverRenderEnginePlugin)
        U.registerPlugin(window.UniverUi.UniverUIPlugin, { container: ref.id, header: false, toolbar: false, footer: false })
        U.registerPlugin(window.UniverSheets.UniverSheetsPlugin)
        U.registerPlugin(window.UniverSheetsUi.UniverSheetsUIPlugin)
        U.registerPlugin(window.UniverSheetsNumfmt.UniverSheetsNumfmtPlugin)
        U.registerPlugin(window.UniverEngineFormula.UniverFormulaEnginePlugin)
        U.registerPlugin(window.UniverSheetsFormula.UniverSheetsFormulaPlugin)
        ref.U = U

        let list = JSON.parse(JSON.stringify(D.all))
        let Head = []
        let data = { "0": {} }
        let columnData = {}
        let align = {}
        let R, ri, ci // row_id, col_id
        if (props.diyColumn && props.columns) {
            Head = props.columns.map(a => a.header)
            props.columns.forEach((a, i) => {
                if (a.width) columnData[i] = { w: a.width }
                if (a.align) align[a.path] = a.align
            })
            const fields = props.columns.map(a => a.path)

            function add(k, v) {
                ci = fields.indexOf(k)
                if (ci > -1) R[ci] = { ri, ci, zp: k, v, s: { ht: align[k] } }
            }

            function getIn(o, path) {
                path = path.split(".")
                return path.reduce((curr, k) => {
                    if (!curr) return
                    return curr[k]
                }, o)
            }

            list.forEach((o, i) => {
                R = {}
                ri = i
                fields.forEach(k => add(k, getIn(o, k)))
                data[i + 1] = R
            })
        } else {
            function add(k, v) {
                if (!Head.includes(k)) Head.push(k)
                ci = Head.indexOf(k)
                R[ci] = { ri, ci, zp: k, v }
            }

            function recur(K, O) {
                if (O && typeof O === "object") {
                    Object.keys(O).forEach(k => {
                        let v = O[k]
                        k = K + "." + k
                        if (Array.isArray(v)) {
                            if (v[0] && typeof v[0] === "object" && !Array.isArray(v[0])) return v.forEach((a, i) => recur(k + "." + i, a))
                            add(k, JSON.stringify(v))
                        } else if (v && typeof v === "object") {
                            recur(k, v)
                        } else add(k, v)
                    })
                } else add(K, O)
            }

            list.forEach((o, i) => {
                R = {}
                ri = i
                Object.keys(o).forEach(k => k !== "_id" && recur(k, o[k]))
                data[i + 1] = R
            })
            if (props.diyColumn && ref.isDev) ref.updateMeta("p.P.columns", Head.map(k => { return { header: k, path: k } }))
        }
        if (ref.isDev && props.enableCRUD) {
            if (!props.onDel) ref.updateMeta("p.P.onDel", '$' + D.model + '.delete($x._id)')
            if (!props.onMod) ref.updateMeta("p.P.onMod", '$' + D.model + '.modify($x._id, updater)')
            if (!props.onNew) ref.updateMeta("p.P.onNew", '$' + D.model + '.create("' + (D.arr[0] ? D.arr[0].type : "type") + '"' + (D.model == "xdb" ? ', date().getTime() + ""' : "") + ', $x)')
            if (!props.onDone) ref.updateMeta("p.P.onDone", 'info("操作成功" + ok + "条，失败" + ng + "条"); log($ctx)')
        }

        const oData = JSON.parse(JSON.stringify(data))
        Head.forEach((v, i) => data[0][i] = { v, s: { ht: 2, bl: 1 } })
        let workbook = ref.container.workbook = U.createUniverSheet({ sheets: { "sheet-01": { name: "_", cellData: data, columnData, rowCount: list.length + (props.extraRow || 0), columnCount: Math.max(Head.length, 5) } } })
        ref.container.diff = () => {
            let nData = workbook.save().sheets["sheet-01"].cellData
            let U = {}
            let C = []
            let D = []
            const header = nData["0"]
            delete nData["0"]
            Object.values(nData).forEach(r => {
                let N = {}
                Object.values(r).forEach((c, i) => {
                    if (!c) return
                    if (c.zp) {
                        if (c.v !== oData[c.ri + 1][c.ci].v) {
                            let id = list[c.ri]._id
                            if (!U[id]) U[id] = {}
                            U[id][c.zp] = c.v
                        }
                    } else {
                        N[header[i].v] = c.v
                    }
                })
                if (Object.keys(N).length) C.push(N)
            })
            if (deleted) {
                let rowIdx = Object.values(nData).map(o => o["0"].ri)
                list.forEach((o, i) => { if (!rowIdx.includes(i)) D.push(o) })
            }
            return { C, U, D }
        }
        ref.container.save = async () => {
            const { C, U, D } = ref.container.diff()
            let R = { D: { ok: [], ng: [] }, C: { ok: [], ng: [] }, U: { ok: [], ng: [] } }
            if (props.onDel && D.length) {
                for (let $x of D) {
                    await ref.exc(props.onDel, { $x }, r => r ? R.D.ok.push($x) : R.D.ng.push($x))
                }
            }
            if (props.onNew && C.length) {
                for (let $x of C) {
                    await ref.exc(props.onNew, { $x }, r => r ? R.C.ok.push($x) : R.C.ng.push($x))
                }
            }
            let _ids = Object.keys(U)
            if (props.onMod && _ids.length) {
                for (let _id of _ids) {
                    let $x = U[_id]
                    let updater = { $set: {}, $unset: {} }
                    Object.keys($x).forEach(k => $x[k] == undefined ? updater.$unset[k] = "" : updater.$set[k] = $x[k])
                    $x._id = _id
                    await ref.exc(props.onMod, { $x, _id, updater }, r => r ? R.U.ok.push($x) : R.U.ng.push($x))
                }
            }
            if (props.onDone) {
                R.ok = R.D.ok.length + R.C.ok.length + R.U.ok.length
                R.ng = R.D.ng.length + R.C.ng.length + R.U.ng.length
                ref.exc(props.onDone, R)
            }
            init(ref)
        }
        ref.container.reload = () => init(ref)

        const API = ref.container.API = window.UniverFacade.FUniver.newAPI(U)
        let deleted = 0
        API.onCommandExecuted(cmd => {
            if (cmd.id === "sheet.command.remove-row") {
                deleted += 1
            } else if (cmd.id === "sheet.mutation.set-range-values") {
                // log(cmd)
            }
        })
    })
}

const css = `
.zp142 {
    max-width: calc(100% - 2px)
}
`

$plugin({
    id: "zp142",
    props: [{
        prop: "path",
        type: "text",
        label: "数据路径",
        ph: "search()的第一个参数"
    }, {
        prop: "extraRow",
        type: "number",
        label: "额外空行"
    }, {
        prop: "diyColumn",
        type: "switch",
        label: "使用自定义列配置"
    }, {
        prop: "columns",
        type: "array",
        label: "列配置",
        show: 'p.P.diyColumn',
        struct: [{
            prop: "header",
            type: "text",
            label: "表头"
        }, {
            prop: "path",
            type: "text",
            label: "字段路径"
        }, {
            prop: "align",
            type: "select",
            insertEmpty: 1,
            label: "对齐方式",
            items: [
                [1, 2, 3],
                ["左对齐", "中间对齐", "右对齐"]
            ]
        }, {
            prop: "width",
            type: "number",
            label: "宽度",
            ph: "px"
        }]
    }, {
        prop: "enableCRUD",
        type: "switch",
        label: "开启【新建/更新/删除】操作"
    }, {
        prop: "onNew",
        type: "text",
        label: "新建事件",
        show: "p.P.enableCRUD"
    }, {
        prop: "onMod",
        type: "text",
        label: "更新事件",
        show: "p.P.enableCRUD"
    }, {
        prop: "onDel",
        type: "text",
        label: "删除事件",
        show: "p.P.enableCRUD"
    }, {
        prop: "onDone",
        type: "text",
        label: "完成事件",
        show: "p.P.enableCRUD"
    }],
    css,
    init,
    destroy: ref => ref.U.dispose()
})


const Univers = [
    "https://unpkg.com/@univerjs/design@0.1.0-beta.4/lib/index.css",
    "https://unpkg.com/@univerjs/ui@0.1.0-beta.4/lib/index.css",
    "https://unpkg.com/@univerjs/sheets-ui@0.1.0-beta.4/lib/index.css",
    "https://unpkg.com/@univerjs/sheets-formula@0.1.0-beta.4/lib/index.css",
    "https://unpkg.com/@univerjs/sheets-numfmt@0.1.0-beta.4/lib/index.css",
    "https://unpkg.com/clsx@2.0.0/dist/clsx.min.js",
    "https://unpkg.com/react@18.2.0/umd/react.production.min.js",
    "https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js",
    "https://unpkg.com/rxjs@7.8.1/dist/bundles/rxjs.umd.min.js",
    "https://unpkg.com/@wendellhu/redi@0.12.13/dist/redi.js",
    "https://unpkg.com/@wendellhu/redi@0.12.13/dist/react-bindings.js",
    "https://unpkg.com/@univerjs/core@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/network@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/design@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/engine-render@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/engine-formula@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/ui@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/sheets@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/docs@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/sheets-ui@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/sheets-formula@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/sheets-numfmt@0.1.0-beta.4/lib/umd/index.js",
    "https://unpkg.com/@univerjs/facade@0.1.0-beta.4/lib/umd/index.js",
]