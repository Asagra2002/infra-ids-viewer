import { create } from 'zustand';
import { BCFCase, BCFCategory, BCFMetadata } from '../bim_components/BCF';
import * as OBC from "@thatopen/components";

interface BCFState {
  categories: BCFCategory[];
  metadata: BCFMetadata;
  selectedCase: BCFCase | null;
  components: OBC.Components | null;
  setCategories: (categories: BCFCategory[]) => void;
  setMetadata: (metadata: BCFMetadata) => void;
  setSelectedCase: (bcfCase: BCFCase | null) => void;
  setComponents: (components: OBC.Components) => void;
  addCase: (categoryId: string, bcfCase: BCFCase) => void;
  updateCaseStatus: (categoryId: string, caseId: string, status: BCFCase['status']) => void;
}

export const useBCFStore = create<BCFState>((set) => ({
  categories: [],
  metadata: { createdAt: new Date().toISOString() },
  selectedCase: null,
  components: null,
  setCategories: (categories) => set({ categories }),
  setMetadata: (metadata) => set({ metadata }),
  setSelectedCase: (selectedCase) => set({ selectedCase }),
  setComponents: (components) => set({ components }),
  addCase: (categoryId, bcfCase) => set((state) => ({
    categories: state.categories.map(category => 
      category.id === categoryId 
        ? { ...category, cases: [...category.cases, bcfCase] }
        : category
    )
  })),
  updateCaseStatus: (categoryId, caseId, status) => set((state) => ({
    categories: state.categories.map(category => 
      category.id === categoryId 
        ? {
            ...category,
            cases: category.cases.map(bcfCase => 
              bcfCase.id === caseId 
                ? { ...bcfCase, status }
                : bcfCase
            )
          }
        : category
    )
  }))
})); 