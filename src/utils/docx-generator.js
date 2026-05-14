/**
 * Markdown 转 Word 文档生成器
 * 将 AI 生成的 Markdown 报告转换为格式化的 .docx 文件
 */

const {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  Footer,
  Header,
  Packer
} = require('docx');
const fs = require('fs');
const path = require('path');

// 报告类型配置
const REPORT_CONFIG = {
  'client-research': {
    title: '客户尽调报告',
    subtitle: '银行业务助手'
  },
  'financial-report': {
    title: '财务分析报告',
    subtitle: '银行业务助手'
  },
  'credit-committee': {
    title: '审贷会准备材料',
    subtitle: '银行业务助手'
  }
};

/**
 * 解析 Markdown 文本为结构化内容
 */
function parseMarkdown(markdown) {
  const lines = markdown.split('\n');
  const elements = [];
  let inTable = false;
  let tableRows = [];
  let inCodeBlock = false;
  let codeContent = [];
  let listLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块处理
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push({ type: 'code', content: codeContent.join('\n') });
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // 表格处理
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // 跳过分隔行
      if (line.match(/^\|[\s\-:|]+\|$/)) {
        continue;
      }
      const cells = line.split('|').filter(c => c.trim() !== '');
      tableRows.push(cells.map(c => c.trim()));
      continue;
    } else if (inTable) {
      elements.push({ type: 'table', rows: tableRows });
      tableRows = [];
      inTable = false;
    }

    // 空行
    if (line.trim() === '') {
      elements.push({ type: 'empty' });
      continue;
    }

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      elements.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2].replace(/\*\*/g, '')
      });
      continue;
    }

    // 无序列表
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.+)/);
    if (ulMatch) {
      const indent = Math.floor(ulMatch[1].length / 2);
      elements.push({
        type: 'list-item',
        level: indent,
        content: ulMatch[3]
      });
      continue;
    }

    // 有序列表
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      const indent = Math.floor(olMatch[1].length / 2);
      elements.push({
        type: 'ordered-list-item',
        level: indent,
        content: olMatch[2]
      });
      continue;
    }

    // 分隔线
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push({ type: 'hr' });
      continue;
    }

    // 普通段落
    elements.push({ type: 'paragraph', content: line });
  }

  // 处理未关闭的表格
  if (inTable && tableRows.length > 0) {
    elements.push({ type: 'table', rows: tableRows });
  }

  return elements;
}

/**
 * 解析行内格式（加粗、斜体、行内代码）
 */
function parseInlineFormatting(text) {
  const runs = [];
  // 简化处理：按 ** 和 * 分割
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
        font: 'Microsoft YaHei',
        size: 21
      }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        italics: true,
        font: 'Microsoft YaHei',
        size: 21
      }));
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        font: 'Consolas',
        size: 20,
        color: '666666'
      }));
    } else {
      runs.push(new TextRun({
        text: part,
        font: 'Microsoft YaHei',
        size: 21
      }));
    }
  }

  return runs;
}

/**
 * 生成 Word 文档
 */
async function generateDocx(markdown, taskType, params) {
  const config = REPORT_CONFIG[taskType] || { title: '分析报告', subtitle: '银行业务助手' };
  const elements = parseMarkdown(markdown);

  // 构建文档标题
  let reportTitle = config.title;
  if (params.clientName) {
    reportTitle = `${params.clientName} - ${config.title}`;
  } else if (params.companyName) {
    reportTitle = `${params.companyName} - ${config.title}`;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  // 构建文档内容
  const children = [];

  // 封面
  children.push(
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      children: [new TextRun({
        text: reportTitle,
        bold: true,
        font: 'Microsoft YaHei',
        size: 52,
        color: '1a3a5c'
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [new TextRun({
        text: config.subtitle,
        font: 'Microsoft YaHei',
        size: 28,
        color: '666666'
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({
        text: `生成日期：${dateStr}`,
        font: 'Microsoft YaHei',
        size: 22,
        color: '999999'
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({
        text: '本报告由 AI 自动生成，仅供内部参考',
        font: 'Microsoft YaHei',
        size: 20,
        color: '999999',
        italics: true
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }),
    new Paragraph({
      children: [new PageBreak()]
    })
  );

  // 正文内容
  for (const element of elements) {
    switch (element.type) {
      case 'heading':
        const headingLevelMap = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
          6: HeadingLevel.HEADING_6
        };
        children.push(new Paragraph({
          children: [new TextRun({
            text: element.content,
            bold: true,
            font: 'Microsoft YaHei',
            size: element.level === 1 ? 36 : element.level === 2 ? 30 : 26,
            color: '1a3a5c'
          })],
          heading: headingLevelMap[element.level] || HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 }
        }));
        break;

      case 'paragraph':
        children.push(new Paragraph({
          children: parseInlineFormatting(element.content),
          spacing: { after: 120 },
          indent: { firstLine: 420 }
        }));
        break;

      case 'list-item':
        children.push(new Paragraph({
          children: [
            new TextRun({ text: '• ', font: 'Microsoft YaHei', size: 21 }),
            ...parseInlineFormatting(element.content)
          ],
          indent: { left: 420 + element.level * 420 },
          spacing: { after: 60 }
        }));
        break;

      case 'ordered-list-item':
        children.push(new Paragraph({
          children: parseInlineFormatting(element.content),
          indent: { left: 420 + element.level * 420 },
          spacing: { after: 60 }
        }));
        break;

      case 'table':
        if (element.rows.length > 0) {
          const colCount = element.rows[0].length;
          const tableRows = element.rows.map((row, rowIndex) => {
            return new TableRow({
              children: row.map(cell => {
                return new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: cell,
                      bold: rowIndex === 0,
                      font: 'Microsoft YaHei',
                      size: 20
                    })],
                    spacing: { before: 40, after: 40 }
                  })],
                  width: { size: Math.floor(9000 / colCount), type: WidthType.DXA }
                });
              })
            });
          });

          children.push(new Table({
            rows: tableRows,
            width: { size: 9000, type: WidthType.DXA }
          }));
          children.push(new Paragraph({ spacing: { after: 120 } }));
        }
        break;

      case 'code':
        children.push(new Paragraph({
          children: [new TextRun({
            text: element.content,
            font: 'Consolas',
            size: 18,
            color: '333333'
          })],
          spacing: { before: 120, after: 120 },
          indent: { left: 420 }
        }));
        break;

      case 'hr':
        children.push(new Paragraph({
          children: [new TextRun({ text: '' })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
          spacing: { before: 200, after: 200 }
        }));
        break;

      case 'empty':
        children.push(new Paragraph({ spacing: { after: 60 } }));
        break;
    }
  }

  // 创建文档
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({
              text: `${config.subtitle} | ${reportTitle}`,
              font: 'Microsoft YaHei',
              size: 16,
              color: '999999'
            })],
            alignment: AlignmentType.RIGHT
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [new TextRun({
              text: '本报告仅供内部参考，不得外传',
              font: 'Microsoft YaHei',
              size: 16,
              color: '999999'
            })],
            alignment: AlignmentType.CENTER
          })]
        })
      },
      children
    }]
  });

  return doc;
}

/**
 * 生成并保存 Word 文件
 * @returns {string} 文件名
 */
async function generateAndSaveDocx(markdown, taskType, params, taskId) {
  const doc = await generateDocx(markdown, taskType, params);
  const buffer = await Packer.toBuffer(doc);

  // 生成文件名
  const name = params.clientName || params.companyName || '报告';
  const config = REPORT_CONFIG[taskType] || { title: '分析报告' };
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${name}_${config.title}_${timestamp}.docx`;

  // 保存文件
  const reportsDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filePath = path.join(reportsDir, `${taskId}.docx`);
  fs.writeFileSync(filePath, buffer);

  return { filePath, filename };
}

module.exports = {
  generateAndSaveDocx,
  generateDocx,
  parseMarkdown
};
