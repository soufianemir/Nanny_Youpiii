import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import { Card, PageTitle } from "@/components/ui/primitives";

type Query=(extra:Record<string,string>)=>string;
type MenuItem={area:string;title:string;description:string;icon:IconName;visible:boolean};

export function MoreHub({q,parent,canChildren,canTeam,canShopping,canCash,canRules}:{q:Query;parent:boolean;canChildren:boolean;canTeam:boolean;canShopping:boolean;canCash:boolean;canRules:boolean}){
  const allItems:MenuItem[]=[
    {area:"children",title:"Enfants",description:"Profils et informations utiles",icon:"child",visible:parent&&canChildren},
    {area:"team",title:"Équipe",description:"Intervenants, horaires et accès",icon:"people",visible:parent&&canTeam},
    {area:"rules",title:"Consignes & routines",description:"Règles, habitudes et routines",icon:"alert",visible:parent&&canRules},
    {area:"shopping",title:"Courses",description:"Liste, achats et caisse",icon:"shopping",visible:canShopping},
    {area:"cash",title:"Caisse",description:"Solde, avances et remboursements",icon:"wallet",visible:canCash&&!canShopping},
  ];
  const items=allItems.filter(item=>item.visible);
  return <div className="v4-stack"><PageTitle eyebrow="Nanny Youpiii" title="Plus" description={parent?"Les réglages et outils moins fréquents restent ici, à l’écart de votre quotidien.":"Seulement les outils auxquels vous avez accès."}/><Card><div className="v4-menu-list">{items.map(item=><Link className="v4-menu-row" key={item.area} href={q({section:"more",area:item.area})}><span className="v4-menu-row-icon"><Icon name={item.icon}/></span><span className="v4-menu-row-copy"><strong>{item.title}</strong><small>{item.description}</small></span><Icon name="chevronRight" size={18}/></Link>)}</div></Card></div>;
}
