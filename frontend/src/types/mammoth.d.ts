declare module 'mammoth/mammoth.browser.min.js' {
  interface MammothResult {
    value: string
    messages: unknown[]
  }
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>
}
