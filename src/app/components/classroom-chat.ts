import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { ChatMessage } from '../models/classroom.types';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

const QUICK_EMOJIS = ['👋', '⭐', '💡', '🚀', '👏', '❤️', '🙋‍♂️', '🎨'];

@Component({
  selector: 'app-classroom-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, FormsModule],
  template: `
    <div id="classroom-chat-container" class="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-hidden">
      <!-- Top Header & Didactic Banner -->
      <div class="px-4 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">forum</mat-icon>
          </div>
          <div>
            <div class="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>{{ t().classroomChat.title }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                {{ classroomService.activePeersCount() }} online
              </span>
            </div>
            <div class="text-[11px] text-slate-400">
              {{ t().classroomChat.subtitle }}
            </div>
          </div>
        </div>

        <!-- Teacher Actions: Clear Chat -->
        @if (isTeacher()) {
          <button
            type="button"
            id="btn-chat-clear"
            class="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs flex items-center gap-1 transition-colors"
            (click)="onClearChat()"
            title="Vaciar mensajes del chat"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">delete_sweep</mat-icon>
            <span>{{ t().classroomChat.clearChat }}</span>
          </button>
        }
      </div>

      <!-- Didactic Quick Prompts Bar -->
      <div class="px-3 py-2 bg-slate-850/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
        <span class="text-[10px] text-slate-400 font-medium whitespace-nowrap pl-1">
          {{ t().classroomChat.quickPromptsTitle }}
        </span>
        <button
          type="button"
          class="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 whitespace-nowrap transition-colors"
          (click)="sendQuickPrompt(t().classroomChat.promptHello)"
        >
          {{ t().classroomChat.promptHello }}
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 whitespace-nowrap transition-colors"
          (click)="sendQuickPrompt(t().classroomChat.promptQuestion, 'question')"
        >
          {{ t().classroomChat.promptQuestion }}
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 whitespace-nowrap transition-colors"
          (click)="sendQuickPrompt(t().classroomChat.promptPraise)"
        >
          {{ t().classroomChat.promptPraise }}
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 whitespace-nowrap transition-colors"
          (click)="sendQuickPrompt(t().classroomChat.promptIdea)"
        >
          {{ t().classroomChat.promptIdea }}
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 whitespace-nowrap transition-colors"
          (click)="sendQuickPrompt(t().classroomChat.promptWork)"
        >
          {{ t().classroomChat.promptWork }}
        </button>
      </div>

      <!-- Messages Area -->
      <div
        #messagesContainer
        id="chat-messages-box"
        class="flex-1 overflow-y-auto p-4 space-y-3 select-text"
      >
        @if (messages().length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-2">
              <mat-icon class="text-2xl !w-6 !h-6 flex items-center justify-center">chat_bubble_outline</mat-icon>
            </div>
            <p class="text-xs max-w-xs leading-relaxed">
              {{ t().classroomChat.emptyMessages }}
            </p>
          </div>
        }

        @for (msg of messages(); track msg.id) {
          <!-- System Message -->
          @if (msg.type === 'system') {
            <div class="flex justify-center my-2 select-none">
              <div class="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-blue-300 flex items-center gap-1.5 shadow-sm">
                <mat-icon class="text-xs !w-3.5 !h-3.5 flex items-center justify-center text-blue-400">campaign</mat-icon>
                <span>{{ msg.text }}</span>
              </div>
            </div>
          } @else {
            <!-- Chat Bubble -->
            <div
              class="flex flex-col"
              [class.items-end]="isMyMessage(msg)"
              [class.items-start]="!isMyMessage(msg)"
            >
              <!-- Author Header -->
              <div class="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                @if (msg.senderRole === 'teacher') {
                  <span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[9px] uppercase">
                    {{ t().classroomChat.msgFromTeacher }}
                  </span>
                }
                <span class="font-medium" [class.text-amber-300]="msg.senderRole === 'teacher'" [class.text-blue-300]="isMyMessage(msg)">
                  {{ msg.senderName }}
                </span>
                <span class="text-[10px] text-slate-500">
                  {{ formatTime(msg.timestamp) }}
                </span>
              </div>

              <!-- Content Bubble -->
              <div
                class="max-w-[82%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-md transition-all"
                [class.bg-blue-600]="isMyMessage(msg) && msg.senderRole !== 'teacher'"
                [class.text-white]="isMyMessage(msg)"
                [class.rounded-tr-xs]="isMyMessage(msg)"
                [class.bg-slate-800]="!isMyMessage(msg) && msg.senderRole !== 'teacher'"
                [class.text-slate-100]="!isMyMessage(msg)"
                [class.rounded-tl-xs]="!isMyMessage(msg)"
                [class.border]="true"
                [class.border-blue-500_40]="isMyMessage(msg) && msg.senderRole !== 'teacher'"
                [class.border-slate-700]="!isMyMessage(msg) && msg.senderRole !== 'teacher'"
                [class.bg-amber-950_40]="msg.senderRole === 'teacher'"
                [class.border-amber-500_50]="msg.senderRole === 'teacher'"
                [class.text-amber-100]="msg.senderRole === 'teacher'"
              >
                @if (msg.emoji) {
                  <span class="text-xl inline-block mr-1.5">{{ msg.emoji }}</span>
                }
                <span class="break-words">{{ msg.text }}</span>
              </div>
            </div>
          }
        }
      </div>

      <!-- Emoji Quick Toolbar -->
      <div class="px-3 py-1.5 bg-slate-850/80 border-t border-slate-800 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-1">
          @for (emoji of quickEmojis; track emoji) {
            <button
              type="button"
              class="w-7 h-7 rounded-lg hover:bg-slate-700/80 flex items-center justify-center text-sm transition-transform active:scale-95"
              (click)="sendEmoji(emoji)"
              [title]="'Enviar ' + emoji"
            >
              {{ emoji }}
            </button>
          }
        </div>

        <span class="text-[10px] text-slate-500 italic hidden sm:inline">
          {{ t().classroomChat.rulesNotice }}
        </span>
      </div>

      <!-- Input Bar -->
      <form
        (ngSubmit)="onSendMessage()"
        class="p-3 bg-slate-850 border-t border-slate-800 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          name="chatText"
          [(ngModel)]="draftText"
          [placeholder]="t().classroomChat.placeholder"
          class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          autocomplete="off"
        />

        <button
          type="submit"
          id="btn-send-message"
          [disabled]="!draftText.trim()"
          class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">send</mat-icon>
          <span>{{ t().classroomChat.send }}</span>
        </button>
      </form>
    </div>
  `,
})
export class ClassroomChatComponent implements AfterViewChecked {
  readonly classroomService = inject(ClassroomService);
  readonly i18n = inject(I18nService);

  readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  draftText = '';
  readonly quickEmojis = QUICK_EMOJIS;

  readonly t = computed(() => this.i18n.t());
  readonly messages = computed(() => this.classroomService.chatMessages());
  readonly currentUser = computed(() => this.classroomService.currentUser());
  readonly isTeacher = computed(() => this.currentUser()?.role === 'teacher');

  private shouldScroll = false;

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  isMyMessage(msg: ChatMessage): boolean {
    const user = this.currentUser();
    return !!user && msg.senderId === user.id;
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  async onSendMessage(): Promise<void> {
    const text = this.draftText.trim();
    if (!text) return;

    this.draftText = '';
    this.shouldScroll = true;
    await this.classroomService.sendChatMessage(text, 'text');
  }

  async sendQuickPrompt(promptText: string, type: 'text' | 'question' = 'text'): Promise<void> {
    this.shouldScroll = true;
    await this.classroomService.sendChatMessage(promptText, type);
  }

  async sendEmoji(emoji: string): Promise<void> {
    this.shouldScroll = true;
    await this.classroomService.sendChatMessage('', 'reaction', emoji);
  }

  async onClearChat(): Promise<void> {
    if (confirm(this.i18n.isDe() ? 'Möchtest du den Klassen-Chat wirklich leeren?' : '¿Deseas vaciar todos los mensajes del chat?')) {
      await this.classroomService.clearChat();
    }
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
