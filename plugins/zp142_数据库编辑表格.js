let ref, exc, container, props
let list, Q, O, count

function init(_ref) {
    ref = _ref
    exc = ref.exc
    container = ref.container
    props = ref.props
    if (parseInt(getComputedStyle(container).height) < 200) container.style.height = "400px"
    if (props.data) {
        if (Array.isArray(props.data)) {
            list = props.data
        } else if (props.data.all && props.data.model) {
            list = props.data.all
            count = props.data.count
            Q = JSON.parse(props.data.query)
            O = JSON.parse(props.data.option)
        }
    }
    list = list ? JSON.parse(JSON.stringify(list)) : []
    excel()
}

function excel() {
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

        list.forEach((o, i) => {
            R = {}
            ri = i
            Object.keys(o).forEach(k => k !== "_id" && recur(k, o[k]))
            data[i + 1] = R
        })
        if (props.diyColumn && ref.isDev) ref.updateMeta("p.P.columns", Head.map(k => { return { header: k, path: k } }))
    }

    const oData = JSON.parse(JSON.stringify(data))
    load(U => {
        Head.forEach((v, i) => data[0][i] = { v, s: { ht: 2, bl: 1 } })
        let workbook = container.workbook = U.createUniverSheet({ sheets: { "sheet-01": { name: "_", cellData: data, columnData, rowCount: list.length + 9, columnCount: Head.length + 3 } } })
        window.diff = container.diff = () => {
            let nData = workbook.save()
            let diff = {}
            let changed = {}
            Object.values(nData.sheets["sheet-01"].cellData).forEach(r => {
                Object.values(r).forEach(c => {
                    if (c && c.zp && c.v !== oData[c.ri + 1][c.ci].v) {
                        //  c.cl = { rgb: 'red' }
                        //  c.bg = { rgb: "rgb(183,83,119)" }
                        //  if (!c.s) c.s = {}
                        //  c.s.bg = { rgb: "rgb(183,83,119)" }
                        //  c.s.cl = { rgb: 'red' }
                        if (!diff[c.ri]) diff[c.ri] = {}
                        diff[c.ri][c.ci] = c.v
                        let id = list[c.ri]._id
                        if (!changed[id]) changed[id] = {}
                        changed[id][c.zp] = c.v
                    }
                })
            })
            // workbook.flush()
            log(nData, diff, changed)
        }

        const API = container.API = window.UniverFacade.FUniver.newAPI(U)
        API.onCommandExecuted(cmd => {
            if (cmd.type !== 2 || cmd.id !== "sheet.mutation.set-range-values") return
            // log(cmd)
        })
    })
}

function getIn(o, path) {
    path = path.split(".")
    return path.reduce((curr, k) => {
        if (!curr) return
        return curr[k]
    }, o)
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

$plugin({
    id: "zp142",
    props: [{
        prop: "data",
        type: "text",
        label: "数据集",
        ph: "($c.x.products)"
    }, {
        prop: "fixedColStart",
        type: "text",
        label: "固定列"
    }, {
        prop: "filter",
        type: "switch",
        label: "服务器端筛选"
    }, {
        prop: "filterFields",
        type: "text",
        label: "可筛选字段",
        ph: '(["type", "x.省份", "x.城市"])',
        show: 'p.P.filter'
    }, {
        prop: "filterTree",
        type: "text",
        label: "筛选树字段",
        ph: '(["type", "x.一级分类", "x.二级分类"])',
        show: 'p.P.filter'
    }, {
        prop: "filterMinCount",
        type: "number",
        ph: "默认至少30条",
        label: "超过多少数据量才显示筛选"
    }, {
        prop: "Excel",
        type: "switch",
        label: "Excel"
    }, {
        prop: "readOnly",
        type: "switch",
        label: "只读",
        show: '!p.P.Excel'
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
            ph: "px, 默认自适应"
        }, {
            prop: "readOnly",
            type: "switch",
            label: "只读",
            show: '!p.P.readOnly'
        }]
    }],
    init
})


/* ----------------------------------------------------------------------------------- */

function load(cb) {
    const arr = [
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
    exc('load(arr)', { arr }, () => {
        let U = new window.UniverCore.Univer({ theme: window.UniverDesign.defaultTheme })
        U.registerPlugin(window.UniverDocs.UniverDocsPlugin, { hasScroll: false })
        U.registerPlugin(window.UniverEngineRender.UniverRenderEnginePlugin)
        U.registerPlugin(window.UniverUi.UniverUIPlugin, { container: ref.id, header: false, toolbar: false, footer: false })
        U.registerPlugin(window.UniverSheets.UniverSheetsPlugin)
        U.registerPlugin(window.UniverSheetsUi.UniverSheetsUIPlugin)
        U.registerPlugin(window.UniverSheetsNumfmt.UniverSheetsNumfmtPlugin)
        U.registerPlugin(window.UniverEngineFormula.UniverFormulaEnginePlugin)
        U.registerPlugin(window.UniverSheetsFormula.UniverSheetsFormulaPlugin)
        cb(U)
    })
}