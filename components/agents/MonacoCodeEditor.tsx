"use client"

import dynamic from "next/dynamic"

const Editor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
})

export default function MonacoCodeEditor(props: {
    value: string
    onChange: (value: string) => void
    language: string
    height?: number
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-border bg-[#0d1117]">
            <Editor
                height={props.height ?? 420}
                defaultLanguage={props.language}
                language={props.language}
                theme="vs-dark"
                value={props.value}
                onChange={(value) => props.onChange(value ?? "")}
                options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbersMinChars: 3,
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    tabSize: 2,
                    renderWhitespace: "selection",
                    smoothScrolling: true,
                }}
            />
        </div>
    )
}
