import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ModalType =
  | 'create-task'
  | 'create-project'
  | 'create-invite'
  | 'task-detail'
  | 'confirm-delete'
  | null;

type BoardView = 'kanban' | 'list';

interface ActiveFilters {
  assignee: string | null;
  priority: string | null;
  label: string | null;
  dueDate: string | null;
  search: string;
}

interface UiState {
  activeModal: ModalType;
  modalData: Record<string, unknown>;
  sidebarOpen: boolean;
  activeProjectId: string | null;
  selectedTaskId: string | null;
  boardView: BoardView;
  activeFilters: ActiveFilters;
  commandPaletteOpen: boolean;
  theme: 'light' | 'dark';
}

const initialState: UiState = {
  activeModal: null,
  modalData: {},
  sidebarOpen: true,
  activeProjectId: null,
  selectedTaskId: null,
  boardView: 'kanban',
  activeFilters: {
    assignee: null,
    priority: null,
    label: null,
    dueDate: null,
    search: '',
  },
  commandPaletteOpen: false,
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openModal(state, action: PayloadAction<{ type: ModalType; data?: Record<string, unknown> }>) {
      state.activeModal = action.payload.type;
      state.modalData = action.payload.data ?? {};
    },
    closeModal(state) {
      state.activeModal = null;
      state.modalData = {};
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setActiveProject(state, action: PayloadAction<string | null>) {
      state.activeProjectId = action.payload;
    },
    setSelectedTask(state, action: PayloadAction<string | null>) {
      state.selectedTaskId = action.payload;
    },
    setBoardView(state, action: PayloadAction<BoardView>) {
      state.boardView = action.payload;
    },
    setFilter(state, action: PayloadAction<Partial<ActiveFilters>>) {
      state.activeFilters = { ...state.activeFilters, ...action.payload };
    },
    clearFilters(state) {
      state.activeFilters = { assignee: null, priority: null, label: null, dueDate: null, search: '' };
    },
    toggleCommandPalette(state) {
      state.commandPaletteOpen = !state.commandPaletteOpen;
    },
    setCommandPaletteOpen(state, action: PayloadAction<boolean>) {
      state.commandPaletteOpen = action.payload;
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
    },
  },
});

export const {
  openModal,
  closeModal,
  toggleSidebar,
  setSidebarOpen,
  setActiveProject,
  setSelectedTask,
  setBoardView,
  setFilter,
  clearFilters,
  toggleCommandPalette,
  setCommandPaletteOpen,
  setTheme,
} = uiSlice.actions;
export default uiSlice.reducer;
