"use client"


import React, { ReactNode } from "react"


interface Props {
sidebar: ReactNode
children: ReactNode
}


export default function MethodologyLayout({ sidebar, children }: Props) {
return (
<div className="h-screen bg-background flex overflow-hidden">
{sidebar}
<div className="flex-1 flex flex-col overflow-hidden">
{children}
</div>
</div>
)
}