export interface LlmProvider {
  /** Trả về giá trị đã `JSON.parse`; ném `Error` có message là mã lỗi
   *  (`LLM_RATE_LIMITED`, `LLM_BAD_JSON`, `LLM_UNAVAILABLE`). */
  generateJson(input: { system: string; user: string; maxTokens?: number }): Promise<unknown>;
}
