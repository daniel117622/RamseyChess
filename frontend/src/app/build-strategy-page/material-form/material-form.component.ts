import { Component, OnInit, Input, ElementRef, AfterViewInit } from '@angular/core';
import { StrategyBuildService } from 'src/services/strategy-build.service';

@Component(
{
    selector: 'app-material-form',
    templateUrl: './material-form.component.html',
    styleUrls: ['./material-form.component.css']
})
export class MaterialFormComponent implements OnInit, AfterViewInit
{
    @Input() sub: string | undefined | null = '';
    materialEval = this.strategy_builder.material_eval;

    private pickSound: HTMLAudioElement | null = null;
    private dropSound: HTMLAudioElement | null = null;

    private readonly pieceNames: string[] = ["King", "Queen", "Rook", "Bishop", "Knight", "Pawn"];

    constructor(
        private strategy_builder: StrategyBuildService,
        private elRef: ElementRef
    ) {}

    ngOnInit(): void
    {
        this.materialEval.owner = this.sub ?? '';
    }

    ngAfterViewInit(): void
    {
        const nativeElement = this.elRef.nativeElement as HTMLElement;
        this.pickSound = nativeElement.querySelector("#pickSound");
        this.dropSound = nativeElement.querySelector("#dropSound");

        const canvasElements = nativeElement.querySelectorAll(".canvas");
        canvasElements.forEach((canvas: Element) =>
        {
            this.setupCanvas(canvas as HTMLElement);
        });

        document.addEventListener("dragstart", () =>
        {
            this.pickSound?.play();
        });

        document.addEventListener("dragend", () =>
        {
            this.dropSound?.play();
        });
    }

    private createCard(color: string, name: string): HTMLDivElement
    {
        let card: HTMLDivElement = document.createElement("div");
        card.classList.add("custom-card", color, "w-100", "p-2");
        card.innerText = name;
        card.draggable = true;

        // Drag events
        card.addEventListener("dragstart", (e: DragEvent) =>
        {
            e.dataTransfer?.setData("text/plain", name);
            card.classList.add("dragging");
            this.pickSound?.play();
        });

        card.addEventListener("dragend", () =>
        {
            card.classList.remove("dragging");
            this.dropSound?.play();
        });

        return card;
    }

    private setupCanvas(canvas: HTMLElement): void
    {
        // Access dataset property with bracket notation.
        const color: string = canvas.dataset['color'] ?? "";

        // Create and append cards
        this.pieceNames.forEach((name: string) =>
        {
            canvas.appendChild(this.createCard(color, name));
        });

        // Drag-and-drop reordering
        canvas.addEventListener("dragover", (e: DragEvent) =>
        {
            e.preventDefault();
            const dragging: HTMLElement | null = document.querySelector(".dragging");
            const afterElement: HTMLElement | null = this.getDragAfterElement(canvas, e.clientY);

            if (dragging)
            {
                if (afterElement == null)
                {
                    canvas.appendChild(dragging);
                }
                else
                {
                    canvas.insertBefore(dragging, afterElement);
                }
            }
        });
    }

    private getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null
    {
        const draggableElements: HTMLElement[] = Array.from(
            container.querySelectorAll(".custom-card:not(.dragging)")
        ) as HTMLElement[];

        interface Accumulator
        {
            offset: number;
            element: HTMLElement | null;
        }

        const initial: Accumulator = { offset: Number.NEGATIVE_INFINITY, element: null };

        const result = draggableElements.reduce(
            (closest: Accumulator, child: HTMLElement): Accumulator =>
            {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset)
                {
                    return { offset: offset, element: child };
                }
                else
                {
                    return closest;
                }
            },
            initial
        );

        return result.element;
    }
}
