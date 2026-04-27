export type SupportedDocumentType = "pdf" | "excel" | "csv" | "json" | "txt"

export type GeneratedDocumentFormat = "txt" | "json" | "xlsx" | "pdf" | "docx"

export type DocumentPreviewMode = "text" | "json" | "table"

export type DocumentTableRow = Record<string, string | number | boolean | null>

export interface GeneratedDocumentPayload {
    title: string
    suggestedFileName: string
    format: GeneratedDocumentFormat
    previewMode: DocumentPreviewMode
    summary: string
    textContent: string
    jsonContent: Record<string, unknown> | Array<unknown> | null
    tableColumns: string[]
    tableRows: DocumentTableRow[]
}
