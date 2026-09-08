"use client";

export default function AppError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="grid min-h-[70vh] place-items-center p-5"><section className="card max-w-lg p-7 text-center"><h1 className="text-2xl font-bold">That play didn’t work</h1><p className="my-4 muted">{error.message||"An unexpected error occurred."}</p><button className="button-primary" onClick={reset}>Try again</button></section></main>}
