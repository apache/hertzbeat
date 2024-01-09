import { ThemeOption } from 'ngx-echarts';

export const CoolTheme: ThemeOption = {
  color: ['#b21ab4', '#6f0099', '#2a2073', '#0b5ea8', '#17aecc', '#b3b3ff', '#eb99ff', '#fae6ff', '#e6f2ff', '#eeeeee'],

  title: {
    textStyle: {
      fontWeight: 'normal',
      color: '#00aecd',
      center: true
    }
  },

  visualMap: {
    color: ['#00aecd', '#a2d4e6']
  },

  toolbox: {
    color: ['#00aecd', '#00aecd', '#00aecd', '#00aecd']
  },

  tooltip: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    axisPointer: {
      // Axis metric, coordinate trigger effective
      type: 'line', // The default is a straight line： 'line' | 'shadow'
      lineStyle: {
        // Straight line metric style settings
        color: '#00aecd',
        type: 'dashed'
      },
      crossStyle: {
        color: '#00aecd'
      },
      shadowStyle: {
        // Shadow metric style settings
        color: 'rgba(200,200,200,0.3)'
      }
    }
  },

  // Area scaling controller
  dataZoom: {
    dataBackgroundColor: '#eee', // Data background color
    fillerColor: 'rgba(144,197,237,0.2)', // Fill the color
    handleColor: '#00aecd' // Handle color
  },

  timeline: {
    lineStyle: {
      color: '#00aecd'
    },
    controlStyle: {
      color: '#00aecd',
      borderColor: '00aecd'
    }
  },

  candlestick: {
    itemStyle: {
      color: '#00aecd',
      color0: '#a2d4e6'
    },
    lineStyle: {
      width: 1,
      color: '#00aecd',
      color0: '#a2d4e6'
    },
    areaStyle: {
      color: '#b21ab4',
      color0: '#0b5ea8'
    }
  },

  chord: {
    padding: 4,
    itemStyle: {
      color: '#b21ab4',
      borderWidth: 1,
      borderColor: 'rgba(128, 128, 128, 0.5)'
    },
    lineStyle: {
      color: 'rgba(128, 128, 128, 0.5)'
    },
    areaStyle: {
      color: '#0b5ea8'
    }
  },

  graph: {
    itemStyle: {
      color: '#b21ab4'
    },
    linkStyle: {
      color: '#2a2073'
    }
  },

  map: {
    itemStyle: {
      color: '#c12e34'
    },
    areaStyle: {
      color: '#ddd'
    },
    label: {
      color: '#c12e34'
    }
  },

  gauge: {
    axisLine: {
      lineStyle: {
        color: [
          [0.2, '#dddddd'],
          [0.8, '#00aecd'],
          [1, '#f5ccff']
        ],
        width: 8
      }
    }
  }
};
