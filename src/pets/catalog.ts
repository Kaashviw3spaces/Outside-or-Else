import type { Species } from '../types/game'
export type PersonalityId = 'playful' | 'sleepy' | 'curious' | 'shy' | 'mischievous'
export type AccessoryId = 'red-collar' | 'blue-collar' | 'pink-bow' | 'green-scarf' | 'flower-crown' | 'backpack'
export type FurId = 'cream' | 'orange' | 'gray' | 'black' | 'white' | 'brown' | 'golden' | 'mixed'
export interface Breed {
  id: string; name: string; species: Species; description: string; fur: FurId[]
  ears: 'pointed' | 'rounded' | 'floppy' | 'large'; coat: 'smooth' | 'fluffy' | 'long'; body: 'normal' | 'round' | 'short'
  tail: 'cat' | 'plume' | 'curl' | 'straight'; pattern: 'tabby' | 'points' | 'siamese' | 'calico' | 'tuxedo' | 'mask' | 'tricolor' | 'spots' | 'saddle' | 'none' | 'classic'
}
const breed = (id: string, name: string, species: Species, description: string, fur: FurId[], ears: Breed['ears'], coat: Breed['coat'], body: Breed['body'], tail: Breed['tail'], pattern: Breed['pattern']): Breed => ({id,name,species,description,fur,ears,coat,body,tail,pattern})
export const BREEDS: Breed[] = [
  breed('orange-tabby','Orange Tabby','cat','Warm stripes and an expressive little tail.',['orange','cream','brown'],'pointed','smooth','normal','cat','tabby'),
  breed('ragdoll','Ragdoll','cat','A soft coat, blue eyes and darker ears and tail.',['cream','white'],'pointed','long','normal','plume','points'),
  breed('siamese','Siamese','cat','A sleek silhouette with a dark face, ears and paws.',['cream','brown'],'pointed','smooth','normal','cat','siamese'),
  breed('british-shorthair','British Shorthair','cat','A round face, rounded ears and a plush body.',['gray','cream','white'],'rounded','smooth','round','cat','none'),
  breed('calico','Calico','cat','Orange and dark patches on a white coat.',['mixed'],'pointed','smooth','normal','cat','calico'),
  breed('tuxedo','Tuxedo','cat','A black coat with a white bib and little white socks.',['black'],'pointed','smooth','normal','cat','tuxedo'),
  breed('persian','Persian','cat','A fluffy round face and a cloudlike coat.',['white','cream','gray'],'rounded','fluffy','round','plume','none'),
  breed('russian-blue','Russian Blue','cat','A slender blue-gray coat and bright green eyes.',['gray'],'pointed','smooth','normal','cat','none'),
  breed('norwegian-forest','Norwegian Forest','cat','Tufted ears, a long ruff and a sweeping tail.',['brown','gray','cream'],'pointed','long','normal','plume','tabby'),
  breed('munchkin','Munchkin','cat','A low little body and short legs.',['cream','orange','gray'],'pointed','smooth','short','cat','tabby'),
  breed('shiba-inu','Shiba Inu','dog','Pointed ears, a cream muzzle and a curled tail.',['orange','black','cream'],'pointed','smooth','normal','curl','mask'),
  breed('golden-retriever','Golden Retriever','dog','Golden fur, floppy ears and a feathered tail.',['golden','cream'],'floppy','long','normal','plume','none'),
  breed('corgi','Corgi','dog','Large upright ears, short legs and a long body.',['orange','mixed'],'large','smooth','short','straight','mask'),
  breed('husky','Husky','dog','A gray-white mask, pointed ears and blue eyes.',['gray','black'],'pointed','smooth','normal','plume','mask'),
  breed('beagle','Beagle','dog','Long floppy ears and a white, brown and black coat.',['mixed'],'floppy','smooth','normal','straight','tricolor'),
  breed('dalmatian','Dalmatian','dog','A smooth white coat dotted with black spots.',['white'],'floppy','smooth','normal','straight','spots'),
  breed('pomeranian','Pomeranian','dog','A fluffy orange ruff and a plumed tail.',['orange','cream','brown'],'pointed','fluffy','round','plume','none'),
  breed('labrador','Labrador','dog','A smooth coat, floppy ears and a sturdy tail.',['golden','black','brown'],'floppy','smooth','normal','straight','none'),
  breed('samoyed','Samoyed','dog','A fluffy white coat and a cheerful curled plume.',['white','cream'],'pointed','fluffy','normal','plume','none'),
  breed('german-shepherd','German Shepherd','dog','Tall pointed ears and black-and-tan markings.',['brown','black'],'large','smooth','normal','straight','saddle'),
]
const classic = (species: Species): Breed => breed(`classic-${species}`,`Original ${species === 'cat' ? 'Cat' : 'Dog'}`,species,'Your original companion, just as you remember.',species === 'cat' ? ['cream','orange','gray','black','white','brown'] : ['orange','golden','cream','brown','black'],'pointed','smooth','normal',species === 'cat' ? 'cat' : 'curl','classic')
export function getBreed(id: string | undefined, species: Species): Breed { return BREEDS.find(b => b.id === id && b.species === species) ?? classic(species) }
export const FURS: Record<FurId, {name: string; color: string; light: string; dark: string}> = {
  cream:{name:'Cream',color:'#f4ebda',light:'#fff9ef',dark:'#938478'}, orange:{name:'Orange',color:'#eab37f',light:'#ffd0a0',dark:'#bc855d'},
  gray:{name:'Blue gray',color:'#91a2b6',light:'#bdc8d5',dark:'#53657d'}, black:{name:'Black',color:'#4b4d58',light:'#737784',dark:'#30323d'},
  white:{name:'White',color:'#f5f1e9',light:'#fffdf8',dark:'#b1aaa0'}, brown:{name:'Brown',color:'#b38b71',light:'#d9b89b',dark:'#665044'},
  golden:{name:'Golden',color:'#edbf78',light:'#ffe0a3',dark:'#ad7d47'}, mixed:{name:'Mixed pattern',color:'#f5eee2',light:'#fff9ef',dark:'#584d49'},
}
export const ACCESSORIES: {id: AccessoryId; name: string; adventures: number}[] = [
  {id:'pink-bow',name:'Pink bow',adventures:0}, {id:'red-collar',name:'Red collar',adventures:1}, {id:'blue-collar',name:'Blue collar',adventures:3},
  {id:'green-scarf',name:'Green scarf',adventures:5}, {id:'flower-crown',name:'Flower crown',adventures:10}, {id:'backpack',name:'Adventure backpack',adventures:15},
]
