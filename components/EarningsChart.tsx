"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface Props {
    data: any[]
}

export default function EarningsChart({ data }: Props) {
    return (
        <div className="border rounded-xl p-4 mt-6">
            <h2 className="text-xl font-bold mb-4">Earnings Over Time</h2>

            <LineChart width={600} height={300} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="earnings" stroke="#4f46e5" />
            </LineChart>
        </div>
    )
}