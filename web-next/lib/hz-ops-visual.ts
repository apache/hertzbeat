export const hzOpsCatalogVisual = {
  contract: 'hertzbeat-ui-ops-catalog-v1',
  visualSystem: 'hertzbeat-native-avant-garde',
  tone: 'hertzbeat-ui-ops-catalog',
  canvasName: 'hertzbeat-ui-matte',
  radius: {
    panel: 'rounded-[4px]',
    control: 'rounded-[3px]',
    badge: 'rounded-[3px]',
    contract: 'panel-4-control-3'
  },
  layout: {
    pageSection: 'relative bg-[#0b0c0e] px-4 py-6 sm:px-6 lg:px-8',
    pageDivider: 'hidden',
    railWidth: '340px',
    railGrid: 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]',
    heroGrid: 'mb-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]',
    regionGap: 'gap-5'
  },
  canvas: {
    root: '-mx-4 -mb-3 -mt-4 min-h-[calc(100vh-64px)] bg-[#0b0c0e] text-[#f2f5f8] sm:-mx-6',
    backgroundStyle: {
      backgroundColor: '#0b0c0e'
    },
    panelMesh: 'hidden',
    panelMeshStyle: {}
  },
  stepper: {
    shell: 'relative overflow-hidden bg-[#0b0c0e] px-5 py-4',
    divider: 'hidden',
    grid: 'mx-auto flex max-w-full flex-wrap items-center justify-center gap-3 text-[13px] text-[#939aa6] xl:max-w-[860px]',
    itemCompact: 'flex shrink-0 items-center gap-2 whitespace-nowrap',
    item: 'flex shrink-0 items-center gap-3 whitespace-nowrap',
    activeBadge: 'flex size-6 items-center justify-center rounded-full bg-[#e5e7eb] text-[12px] font-semibold text-[#06070a] shadow-[0_0_18px_rgba(255,255,255,0.14)]',
    idleBadge: 'flex size-6 items-center justify-center rounded-full border border-[#343a45] bg-[#111419] text-[12px] font-semibold text-[#858d9a]',
    connector: 'hidden h-px w-12 flex-none bg-[#252b34] sm:block md:w-24 xl:w-40',
    activeLabel: 'font-semibold text-white'
  },
  panel: {
    hero: 'relative overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.42)]',
    railTrack: '',
    rail: 'self-start rounded-[4px] border border-[#2a303a] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]',
    railMode: 'static-flow',
    railTrackMode: 'none',
    railFixed: '',
    railPlaceholder: '',
    railStickyStyle: {}
  },
  button: {
    row: 'mt-6 flex flex-wrap items-center gap-2',
    compact: 'min-w-[88px]',
    primaryCompact:
      'min-w-[88px] border-[#31405c] bg-[#182238] text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white',
    sizeContract: 'standard-sm-88'
  },
  entry: {
    main: 'min-h-[calc(100vh-140px)] bg-[#0b0c0e] px-8 py-6 text-[#d9dee8]',
    container: 'mx-auto max-w-[1280px]',
    header: 'pb-5',
    headerLayout: 'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between',
    kicker: 'text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]',
    title: 'mt-1 text-[28px] font-semibold leading-tight text-[#f5f7fb]',
    subtitle: 'mt-2 max-w-[720px] text-[13px] leading-6 text-[#a9b0bb]',
    grid: 'grid items-start gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_340px]',
    panel:
      'rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-6 py-5 shadow-[0_20px_56px_rgba(0,0,0,0.32)]',
    panelEyebrow: 'text-[11px] font-semibold tracking-[0.12em] text-[#7e8494]',
    panelCopy: 'mt-4 max-w-[850px] text-[13px] leading-6 text-[#a9b0bb]',
    chip: 'rounded-[3px] border border-[#303743] bg-[#101217] px-2.5 py-1 text-[11px] leading-none text-[#aeb7c7]',
    rail: 'self-start rounded-[4px] border border-[#2a303a] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]',
    railTitle: 'text-[12px] font-semibold text-[#f0f3f8]',
    checklistItem: 'grid grid-cols-[12px_minmax(0,1fr)] gap-3',
    checklistDot: 'mt-1.5 h-2 w-2 rounded-[2px]',
    checklistTitle: 'text-[12px] font-semibold leading-5 text-[#eef1f6]',
    checklistCopy: 'mt-0.5 text-[12px] leading-5 text-[#8f99ab]',
    empty:
      'flex min-h-[226px] items-center justify-center rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] px-8 py-10 lg:col-span-2 lg:mr-[360px]',
    emptyIcon:
      'mx-auto flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]',
    emptyTitle: 'mt-8 text-[15px] font-semibold text-[#f1f4fa]',
    emptyCopy: 'mt-3 text-[13px] leading-6 text-[#a6b0c0]',
    baseline: 'hertzbeat-ui-entry'
  },
  signal: {
    band: 'grid w-full gap-2',
    ribbon: 'grid grid-cols-[minmax(92px,1fr)_auto] items-center gap-3 rounded-[3px] border border-[#252b34] bg-[#101319] px-3 py-2',
    label: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a9b0bb]',
    detail: 'mt-0.5 text-[11px] text-[#6f7681]',
    activeValue: 'text-[17px] font-semibold text-[#f8fafc]',
    value: 'text-[17px] font-semibold text-[#cbd5e1]'
  },
  search: {
    row: 'mb-6 flex h-[36px] items-center rounded-[3px] border border-[#282d36] bg-[#101217] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
    input: 'h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#eef2f7] outline-none placeholder:text-[#6f7788]',
    mode: 'instant-results-inline'
  },
  sourceCard: {
    className:
      'group relative flex h-[36px] items-center gap-2.5 overflow-hidden rounded-[3px] border border-[#282d36] bg-[#101217] px-3 text-[12px] font-semibold text-[#eef2f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[#4b5563] hover:bg-[#151820]',
    grid: 'grid gap-2 md:grid-cols-2 xl:grid-cols-3',
    gridSpan: 'third-width-cards',
    stack: 'space-y-6',
    section: 'space-y-2',
    heading: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e8494]',
    icon: 'flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-[#1c2028] text-[#cbd5e1]',
    mark: 'flex size-4 shrink-0 items-center justify-center rounded-[3px] border text-[8px] font-bold leading-none',
    label: 'min-w-0 truncate leading-4',
    empty: 'rounded-[3px] border border-[#2a303a] bg-[#0c0f15] px-4 py-8 text-center text-[13px] text-[#858d9a]'
  },
  filter: {
    title: 'mb-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#c4cad4]',
    list: 'space-y-3.5',
    item: 'grid grid-cols-[minmax(0,auto)_1fr_38px] items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.1em]',
    activeText: 'whitespace-nowrap text-[#f8fafc]',
    idleText: 'whitespace-nowrap text-[#858d9a]',
    dash: 'h-px w-full border-t border-dashed border-[#303743]',
    count: 'flex h-6 w-[38px] items-center justify-center rounded-full border border-[#2f3742] bg-[#12161d] text-[10px] tabular-nums text-[#c5cad3]'
  }
} as const;
