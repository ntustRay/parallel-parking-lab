import * as THREE from './vendor/three.module.min.js';
import {CAR} from './physics.js';

// Car-local metres, facing -Z. Keep the opaque shell separate from canvas
// instruments so its coverage and window openings can be checked without WebGL.
export const CABIN_BOUNDS=Object.freeze({halfWidth:CAR.width/2-.115,floor:.30,sill:.88,front:-1.04,rear:1.18,roof:CAR.height-.08,roofHalfWidth:.625,roofFront:-.40,roofRear:.66});
const cube=new THREE.BoxGeometry(1,1,1);

export function createCabinShell(material){
  const group=new THREE.Group();group.name='cabin-shell';
  const materials=new Map();
  const finish=material||((color,metalness=0)=>{
    const key=color+metalness;
    if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:metalness?.4:.9,metalness}));
    return materials.get(key);
  });
  const {halfWidth:h,floor,sill,front,rear,roof,roofHalfWidth:rh,roofFront:rf,roofRear:rr}=CABIN_BOUNDS;
  function box(name,color,x,y,z,w,height,d,metalness=0){
    const mesh=new THREE.Mesh(cube,finish(color,metalness));mesh.name=name;
    mesh.position.set(x,y,z);mesh.scale.set(w,height,d);group.add(mesh);return mesh;
  }
  function rounded(name,color,x,y,z,w,height,d,r=.025){
    const geometry=new THREE.BoxGeometry(w,height,d,6,4,6),p=geometry.attributes.position;
    const v=new THREE.Vector3(),center=new THREE.Vector3();r=Math.min(r,w/2,height/2,d/2);
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);
      center.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-height/2+r,height/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));
      v.sub(center).normalize().multiplyScalar(r).add(center);p.setXYZ(i,v.x,v.y,v.z);
    }
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,finish(color));mesh.name=name;mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  function panel(name,color,points){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,1,0,0,0],2));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    const m=finish(color).clone();m.side=THREE.DoubleSide;
    const mesh=new THREE.Mesh(geometry,m);mesh.name=name;group.add(mesh);return mesh;
  }
  function beam(name,color,a,b,w,d){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),axis=end.clone().sub(start),mid=start.clone().add(end).multiplyScalar(.5);
    const mesh=box(name,color,mid.x,mid.y,mid.z,w,axis.length(),d);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());return mesh;
  }

  // Continuous opaque floor, firewall and rear bulkhead. Door skins overlap
  // these surfaces; trim must never be the only thing hiding the street.
  box('floor','#242b30',0,floor, (front+rear)/2,h*2+.08,.08,rear-front+.10);
  box('firewall','#252c31',0,.61,front,h*2+.08,.64,.10);
  box('rear-bulkhead','#2b3237',0,.57,rear,h*2+.08,.62,.10);
  rounded('transmission-tunnel','#242b31',0,.40,.04,.24,.20,1.70,.05);
  rounded('center-console','#30373c',0,.58,.21,.22,.24,.67,.035);
  rounded('console-armrest','#171d23',0,.73,.43,.24,.10,.33,.03);
  box('console-inlay','#141c22',0,.713,.02,.15,.014,.18);

  // Headliner and tapered roof rails follow the exterior's sloping glass.
  box('headliner','#777c7d',0,roof+.025,(rf+rr)/2,rh*2,.05,rr-rf+.05);
  beam('windscreen-header','#687074',[-rh,roof,rf],[rh,roof,rf],.065,.075);
  beam('rear-window-header','#687074',[-rh,roof,rr],[rh,roof,rr],.065,.075);
  box('parcel-shelf','#41494c',0,.875,1.02,h*2,.055,.40);

  for(const side of [-1,1]){
    const label=side<0?'left':'right';
    box(label+'-door-skin','#2b3237',side*(h+.025),(floor+sill)/2,(front+rear)/2,.11,sill-floor+.055,rear-front+.10);
    // Both front and rear door cards sit on a complete skin, with visible
    // armrests, a lower pocket and a small seam between the doors.
    for(const [name,z,length] of [['front',-.34,1.32],['rear',.78,.78]]){
      rounded(label+'-'+name+'-door-card','#363e44',side*(h-.037),.655,z,.055,.32,length-.06,.02);
      rounded(label+'-'+name+'-armrest','#171d23',side*(h-.085),.64,z+.035,.115,.075,length*.55,.025);
      rounded(label+'-'+name+'-pocket','#20282e',side*(h-.055),.405,z,.065,.13,length*.68,.015);
      box(label+'-'+name+'-handle-recess','#171d22',side*(h-.069),.765,z-.14,.018,.065,.22);
      box(label+'-'+name+'-handle','#aab4b8',side*(h-.083),.773,z-.14,.018,.019,.15,.65);
    }
    box(label+'-door-seam','#151e24',side*(h-.034),.59,.36,.012,.49,.013);
    box(label+'-window-sill','#4a5357',side*(h-.012),sill-.003,(front+rear)/2,.10,.05,rear-front+.03);
    box(label+'-sill-trim','#879297',side*(h-.071),.837,(front+rear)/2,.012,.012,rear-front-.10,.4);
    beam(label+'-a-pillar','#687074',[side*h,sill,-.96],[side*rh,roof,rf],.095,.10);
    beam(label+'-a-seal','#171f24',[side*(h+.02),sill,-.97],[side*(rh+.025),roof,rf],.025,.11);
    beam(label+'-roof-rail','#687074',[side*rh,roof,rf],[side*rh,roof,rr],.07,.075);
    beam(label+'-b-pillar','#555e65',[side*h,sill,.38],[side*rh,roof,.31],.095,.09);
    // The broad C pillar closes the quarter behind the rear door, leaving
    // a real rear windscreen between the two pillars rather than a solid wall.
    panel(label+'-c-pillar','#687074',[[side*h,sill,.94],[side*h,sill,rear+.025],[side*rh,roof,rr+.02],[side*rh,roof,.52]]);
    beam(label+'-rear-window-seal','#171f24',[side*h,sill,rear],[side*rh,roof,rr],.025,.04);
    box(label+'-belt-anchor','#929b9e',side*(h-.06),1.13,.36,.03,.08,.045,.4);
    beam(label+'-belt','#242b31',[side*(h-.07),1.12,.36],[side*.66,.54,.60],.028,.012);
    const visor=rounded(label+'-visor','#555e65',side*.34,roof-.018,-.35,.49,.035,.17,.012);visor.rotation.x=-.08;
  }

  // Seat pans, bolsters, backrests and head restraints. The driver's backrest
  // is behind the eye; it must not intersect the near plane when turning.
  for(const x of [-.4,.4]){
    const name=x<0?'driver':'passenger';
    rounded(name+'-seat-base','#171d23',x,.405,.40,.55,.17,.63,.045);
    rounded(name+'-seat-cushion','#343d44',x,.51,.36,.48,.12,.56,.045);
    for(const side of [-1,1])rounded(name+'-seat-bolster-'+side,'#242b31',x+side*.215,.57,.38,.075,.13,.54,.03);
    const back=rounded(name+'-seat-back','#242b31',x,.80,.72,.53,.58,.14,.045);back.rotation.x=.12;
    const inset=rounded(name+'-seat-inset','#343d44',x,.82,.633,.37,.40,.025,.012);inset.rotation.x=.12;
    for(const side of [-1,1])box(name+'-headrest-post-'+side,'#aab4b8',x+side*.085,1.115,.75,.014,.12,.014,.65);
    rounded(name+'-headrest','#242b31',x,1.205,.76,.31,.19,.13,.04);
  }
  rounded('rear-seat-cushion','#343d44',0,.51,.99,1.40,.18,.38,.045);
  const rearBack=rounded('rear-seat-back','#242b31',0,.69,1.135,1.42,.39,.14,.04);rearBack.rotation.x=.10;
  for(const x of [-.46,0,.46]){
    rounded('rear-seat-inset-'+x,'#343d44',x,.71,1.052,.33,.26,.025,.012);
    rounded('rear-headrest-'+x,'#242b31',x,.975,1.13,x===0?.22:.27,.16,.11,.03);
  }
  // A short exterior bonnet is visible below the windscreen, as it is when
  // the exterior player mesh is shown in the other three camera views.
  panel('bonnet','#326576',[[-.71,.71,-2.10],[.71,.71,-2.10],[.80,.88,-1.0],[-.80,.88,-1.0]]);
  return group;
}
