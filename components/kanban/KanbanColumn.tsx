"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Plus, GripHorizontal, Edit, Trash, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

interface SubprojectColumn {
    id: string;
    name: string;
    description: string | null;
    color: string;
    accent: string;
    order: number;
    isVisible: boolean;
}

interface KanbanColumnProps {
    column: SubprojectColumn;
    children: React.ReactNode;
    count: number;
    onAddSubproject: () => void;
    onEditColumn: () => void;
    onDeleteColumn: () => void;
    onMoveColumn: (dir: "left" | "right") => void;
    onHideColumn: () => void;
    isFirst: boolean;
    isLast: boolean;
}

export function KanbanColumn({
    column,
    children,
    count,
    onAddSubproject,
    onEditColumn,
    onDeleteColumn,
    onMoveColumn,
    onHideColumn,
    isFirst,
    isLast
}: KanbanColumnProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: column.id,
        data: {
            type: "column",
            column
        }
    });

    const [headerHovered, setHeaderHovered] = useState(false);

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (!column.isVisible) return null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex flex-col gap-4 w-80 shrink-0 p-4 rounded-3xl border transition-all duration-300 min-h-[500px]",
                column.color,
                isDragging && "opacity-50 scale-[0.98] z-40 bg-slate-100/50"
            )}
            onMouseEnter={() => setHeaderHovered(true)}
            onMouseLeave={() => setHeaderHovered(false)}
        >
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 group/header">
                    <div 
                        {...attributes} 
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-white/50 rounded-md transition-colors"
                    >
                        <GripHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <span className={cn("h-3 w-3 rounded-full shadow-sm", column.accent)} />
                    <h3 className="font-extrabold text-slate-700 uppercase tracking-widest text-xs truncate max-w-[140px]">
                        {column.name}
                    </h3>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 shadow-sm border border-slate-100">
                        {count}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onAddSubproject}
                        className="h-8 w-8 rounded-full hover:bg-white/80 text-slate-400 hover:text-indigo-600"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Popover>
                        <PopoverTrigger>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn(
                                    "h-8 w-8 rounded-full hover:bg-white/80 text-slate-400",
                                    headerHovered ? "opacity-100" : "opacity-0"
                                )}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1 rounded-2xl shadow-xl border-slate-100" align="end">
                             <div className="flex px-1 py-1 gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 h-8 rounded-lg"
                                    disabled={isFirst}
                                    onClick={() => onMoveColumn("left")}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="w-[1px] bg-slate-100 my-1" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 h-8 rounded-lg"
                                    disabled={isLast}
                                    onClick={() => onMoveColumn("right")}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="my-1 border-t border-slate-50" />
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 h-9 px-2 text-xs font-bold uppercase rounded-lg text-slate-600"
                                onClick={onEditColumn}
                            >
                                <Edit className="h-3.5 w-3.5" /> Edit Column
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 h-9 px-2 text-xs font-bold uppercase rounded-lg text-slate-600"
                                onClick={onHideColumn}
                            >
                                <EyeOff className="h-3.5 w-3.5" /> Hide Column
                            </Button>
                            <div className="my-1 border-t border-slate-50" />
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 h-9 px-2 text-xs font-bold uppercase rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={onDeleteColumn}
                            >
                                <Trash className="h-3.5 w-3.5" /> Delete Column
                            </Button>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {column.description && (
                <p className="px-2 text-[10px] text-slate-500 font-medium leading-relaxed italic opacity-70">
                    {column.description}
                </p>
            )}

            <div className="flex flex-col gap-4 flex-1">
                {children}
            </div>
        </div>
    );
}
