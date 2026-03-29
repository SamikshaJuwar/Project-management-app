"use client";

import { useState, useCallback, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { SortableCard } from "./SortableCard";
import { createPortal } from "react-dom";

interface Column {
    id: string;
    name: string;
    description: string | null;
    color: string;
    accent: string;
    order: number;
    isVisible: boolean;
}

interface Subproject {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
    columnId: string | null;
    assignedUsers: any[];
}

interface KanbanBoardProps {
    columns: Column[];
    subprojects: Subproject[];
    onSubprojectMove: (subprojectId: string, targetColumnId: string) => void;
    onColumnMove: (columnId: string, newOrder: number) => void;
    renderCard: (subproject: Subproject) => React.ReactNode;
    onAddSubproject: (columnId: string) => void;
    onEditColumn: (column: Column) => void;
    onDeleteColumn: (columnId: string) => void;
    onHideColumn: (columnId: string) => void;
}

export function KanbanBoard({
    columns,
    subprojects,
    onSubprojectMove,
    onColumnMove,
    renderCard,
    onAddSubproject,
    onEditColumn,
    onDeleteColumn,
    onHideColumn
}: KanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<"column" | "subproject" | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveType(active.data.current?.type || null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeType === "subproject") {
            const activeData = active.data.current;
            const overData = over.data.current;

            // Handle dragging over a column
            if (overData?.type === "column" && activeData?.columnId !== overId) {
                // Logic handled in DragEnd for final drop
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeType === "column") {
            if (activeId !== overId) {
                const oldIndex = columns.findIndex((col) => col.id === activeId);
                const newIndex = columns.findIndex((col) => col.id === overId);
                onColumnMove(activeId, newIndex);
            }
        } else if (activeType === "subproject") {
            const overData = over.data.current;
            const activeSub = subprojects.find(s => s.id === activeId);
            
            let targetColumnId: string | null = null;

            if (overData?.type === "column") {
                targetColumnId = overId;
            } else if (overData?.type === "subproject") {
                const overSub = subprojects.find(s => s.id === overId);
                targetColumnId = overSub?.columnId || null;
            } else {
                // Fallback: check if we dropped directly on a column container which might not have type data correctly set in all spots
                const overCol = columns.find(c => c.id === overId);
                if (overCol) targetColumnId = overCol.id;
            }

            if (targetColumnId && activeSub && activeSub.columnId !== targetColumnId) {
                onSubprojectMove(activeId, targetColumnId);
            }
        }
    };

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-8 overflow-x-auto pb-10 pt-2 px-1">
                <SortableContext
                    items={columns.map((col) => col.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    {columns.map((col, index) => (
                        <KanbanColumn
                            key={col.id}
                            column={col}
                            count={subprojects.filter(s => s.columnId === col.id).length}
                            onAddSubproject={() => onAddSubproject(col.id)}
                            onEditColumn={() => onEditColumn(col)}
                            onDeleteColumn={() => onDeleteColumn(col.id)}
                            onMoveColumn={(dir) => {
                                const newIdx = dir === "left" ? index - 1 : index + 1;
                                onColumnMove(col.id, newIdx);
                            }}
                            onHideColumn={() => onHideColumn(col.id)}
                            isFirst={index === 0}
                            isLast={index === columns.length - 1}
                        >
                            <SortableContext
                                items={subprojects
                                    .filter((s) => s.columnId === col.id)
                                    .map((s) => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-4 min-h-[150px]">
                                    {subprojects
                                        .filter((s) => s.columnId === col.id)
                                        .map((subproject) => (
                                            <SortableCard key={subproject.id} id={subproject.id}>
                                                {renderCard(subproject)}
                                            </SortableCard>
                                        ))}
                                    {subprojects.filter(s => s.columnId === col.id).length === 0 && (
                                        <div className="flex-1 border-2 border-dashed border-slate-200/50 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60 h-32">
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Empty Column</p>
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </KanbanColumn>
                    ))}
                </SortableContext>
            </div>

            {typeof document !== 'undefined' && createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeId ? (
                        activeType === "column" ? (
                            <div className="opacity-80 scale-105">
                                <KanbanColumn
                                    column={columns.find(c => c.id === activeId)!}
                                    count={subprojects.filter(s => s.columnId === activeId).length}
                                    onAddSubproject={() => {}}
                                    onEditColumn={() => {}}
                                    onDeleteColumn={() => {}}
                                    onMoveColumn={() => {}}
                                    onHideColumn={() => {}}
                                    isFirst={false}
                                    isLast={false}
                                >
                                    <div className="flex flex-col gap-4">
                                        {subprojects
                                            .filter(s => s.columnId === activeId)
                                            .map(s => renderCard(s))}
                                    </div>
                                </KanbanColumn>
                            </div>
                        ) : (
                            <div className="opacity-80 scale-105 shadow-2xl rotate-2">
                                {renderCard(subprojects.find(s => s.id === activeId)!)}
                            </div>
                        )
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
