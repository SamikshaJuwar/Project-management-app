"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface SortableCardProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

export function SortableCard({ id, children, className }: SortableCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id,
        data: {
            type: "subproject"
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "touch-none",
                isDragging && "opacity-50 grayscale scale-[0.98] z-50",
                className
            )}
        >
            {children}
        </div>
    );
}
