export type Delivery = { tipo: string; nivel: number };
export type Designer = {
  id: string; nome: string; curto: string; funcao: string; email: string; admissao: string; squad: string;
  clientes: string[]; formacao: string; gostos: string[]; entregas: Delivery[]; teto: string; simultaneo: string;
  processo: string; ferramentas: string[]; briefings: string; interesses: string[]; interessesTxt: string;
  desenvolver: string[]; desenvolverTxt: string; obs: string; created_at?: string; updated_at?: string;
};
export const emptyDesigner = (): Omit<Designer,'id'> => ({ nome:'',curto:'',funcao:'',email:'',admissao:'',squad:'',clientes:[],formacao:'',gostos:[],entregas:[],teto:'',simultaneo:'',processo:'',ferramentas:[],briefings:'',interesses:[],interessesTxt:'',desenvolver:[],desenvolverTxt:'',obs:'' });
export const interestTags = (d:Designer) => [...new Set([...d.interesses,...d.gostos].map(x=>x.trim()).filter(Boolean))];
