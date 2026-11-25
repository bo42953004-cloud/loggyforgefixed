"use client";
import { useEffect } from "react";
export default function AdminShortcut(){useEffect(()=>{const handler=(event:KeyboardEvent)=>{if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==="a"){event.preventDefault();window.location.assign("/admin/login");}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[]);return null;}
