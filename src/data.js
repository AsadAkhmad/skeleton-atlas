// Anatomical information for every bone. Sizes are typical adult-male averages (cm unless stated).
// art: articulating bones. '*' = both sides, otherwise same side as the bone shown.
export const INFO = {};
const add = (key, o) => { INFO[key] = o; };
const S = (...pairs) => pairs.map((p) => ({ k: p[0], v: p[1] }));

// ---------------- SKULL: cranial bones ----------------
add('frontal', {
  name: 'Frontal bone', latin: 'Os frontale', type: 'Flat bone (cranial)', short: 'Frontal',
  size: S(['Arc length (nasion to bregma)', '≈ 12 cm'], ['Breadth', '≈ 11 cm'], ['Thickness', '5–8 mm']), lenCm: 12,
  fn: 'Forms the forehead and the roof of both eye sockets. It protects the front of the brain (the frontal lobes) and contains the frontal sinuses.',
  feat: ['Squamous part (the forehead)', 'Supraorbital margin with notch or foramen', 'Glabella and superciliary arches (brow ridges)', 'Frontal sinuses (air-filled cavities)', 'Zygomatic processes and temporal lines'],
  art: ['parietal*', 'sphenoid', 'ethmoid', 'nasal*', 'lacrimal*', 'maxilla*', 'zygomatic*'],
  att: 'Frontalis (via the galea), corrugator supercilii, procerus, temporalis (temporal line).',
  fact: 'It begins as two halves. The metopic suture between them normally closes in early childhood but stays open in roughly 1 in 10 adults.',
});
add('parietal', {
  name: 'Parietal bone', latin: 'Os parietale', type: 'Flat bone (cranial)', short: 'Parietal', paired: true,
  size: S(['Length (front to back)', '≈ 11–12 cm'], ['Height (top to side)', '≈ 10–11 cm'], ['Thickness', '3–6 mm']), lenCm: 12,
  fn: 'Together with its partner, forms most of the roof and upper sides of the skull, protecting the cerebral hemispheres.',
  feat: ['Parietal eminence (the widest bulge)', 'Temporal lines', 'Grooves for the middle meningeal artery', 'Meets four sutures: sagittal, coronal, squamous, lambdoid'],
  art: ['parietal@opp', 'frontal', 'occipital', 'temporal', 'sphenoid'],
  att: 'Temporalis muscle (inferior temporal line); galea aponeurotica.',
  fact: 'Where the parietal, frontal, temporal and sphenoid meet is the pterion, the thinnest part of the side of the skull. A blow there can tear the artery beneath it.',
});
add('occipital', {
  name: 'Occipital bone', latin: 'Os occipitale', type: 'Flat bone (cranial)', short: 'Occipital',
  size: S(['Breadth', '≈ 11–12 cm'], ['Foramen magnum', '≈ 3.5 × 3.0 cm'], ['Thickness', '5–15 mm']), lenCm: 12,
  fn: 'Forms the back and base of the skull. The foramen magnum lets the spinal cord join the brainstem, and two condyles rest on the atlas (C1) so the head can nod "yes".',
  feat: ['Foramen magnum', 'Occipital condyles', 'External occipital protuberance (inion)', 'Superior and inferior nuchal lines', 'Hypoglossal canals, basilar part'],
  art: ['parietal*', 'temporal*', 'sphenoid', 'C1'],
  att: 'Trapezius, semispinalis capitis, splenius capitis, sternocleidomastoid, rectus capitis posterior major and minor.',
  fact: 'The bump you can feel at the back of the head is the inion. It marks where the nuchal ligament and neck muscles attach.',
});
add('temporal', {
  name: 'Temporal bone', latin: 'Os temporale', type: 'Irregular bone (cranial)', short: 'Temporal',
  size: S(['Length', '≈ 8–9 cm'], ['Squama height', '≈ 5 cm'], ['Mastoid process', '2–3 cm'], ['Styloid process', '2–3 cm']), lenCm: 9,
  fn: 'Houses the organs of hearing and balance, forms the socket of the jaw joint (TMJ) and the rear half of the cheek arch, and protects the side of the brain.',
  feat: ['Squamous, petrous, mastoid, tympanic parts', 'Mandibular fossa and articular tubercle', 'External acoustic meatus (ear canal)', 'Mastoid and styloid processes', 'Carotid canal, internal acoustic meatus'],
  art: ['parietal', 'occipital', 'sphenoid', 'zygomatic', 'mandible'],
  att: 'Sternocleidomastoid and digastric (mastoid), stylohyoid, styloglossus, stylopharyngeus, temporalis (fossa).',
  fact: 'The petrous part, containing the cochlea and balance organs, is the densest bone in the body.',
});
add('sphenoid', {
  name: 'Sphenoid bone', latin: 'Os sphenoidale', type: 'Irregular bone (cranial)', short: 'Sphenoid',
  size: S(['Wingspan (greater wings)', '≈ 12–13 cm'], ['Body', '≈ 2 cm cube'], ['Front-to-back length', '≈ 4.5 cm']), lenCm: 12.5,
  fn: 'The keystone of the skull base, touching every other cranial bone. It cradles the pituitary gland, forms parts of the orbit and the temple, and its pterygoid plates anchor chewing muscles.',
  feat: ['Body with sella turcica (pituitary fossa)', 'Greater and lesser wings', 'Optic canals and superior orbital fissures', 'Pterygoid processes', 'Sphenoid sinuses'],
  art: ['frontal', 'parietal*', 'temporal*', 'occipital', 'ethmoid', 'zygomatic*', 'palatine*', 'vomer', 'maxilla*'],
  att: 'Lateral and medial pterygoid, tensor veli palatini, temporalis, extra-ocular muscles (common tendinous ring).',
  fact: 'The name means "wedge-shaped". Seen from above it looks like a bat or butterfly with open wings.',
});
add('ethmoid', {
  name: 'Ethmoid bone', latin: 'Os ethmoidale', type: 'Irregular bone (cranial)', short: 'Ethmoid',
  size: S(['Length', '≈ 4 cm'], ['Width', '≈ 2.5 cm'], ['Height', '≈ 3.5 cm'], ['Plate thickness', '< 1 mm']), lenCm: 4,
  fn: 'Forms the roof and side walls of the nose, part of the inner wall of each orbit and the upper nasal septum. Its perforated cribriform plate passes the nerves of smell.',
  feat: ['Cribriform plate (about 20 olfactory foramina)', 'Crista galli', 'Perpendicular plate (nasal septum)', 'Ethmoidal labyrinths with air cells', 'Superior and middle nasal conchae'],
  art: ['frontal', 'sphenoid', 'maxilla*', 'lacrimal*', 'palatine*', 'inferior-concha*', 'vomer'],
  att: 'Crista galli anchors the falx cerebri (dura mater). No major muscle attachments.',
  fact: '"Ethmoid" comes from the Greek for "sieve". It is one of the most delicate bones in the skull.',
});

// ---------------- SKULL: facial bones ----------------
add('maxilla', {
  name: 'Maxilla (upper jaw)', latin: 'Maxilla', type: 'Irregular bone (facial)', short: 'Maxilla', paired: true,
  size: S(['Height', '≈ 6–7 cm'], ['Depth (front to back)', '≈ 4.5 cm'], ['Alveolar arch', 'sockets for 8 teeth']), lenCm: 6.5,
  fn: 'Forms the upper jaw, the front two-thirds of the hard palate, the floor of the orbit and the sides of the nasal opening. It holds the upper teeth and contains the maxillary sinus.',
  feat: ['Alveolar process (tooth sockets)', 'Palatine process (hard palate)', 'Frontal process (beside the nose)', 'Infraorbital foramen', 'Maxillary sinus, the largest sinus (about 15 mL)'],
  art: ['maxilla@opp', 'nasal', 'frontal', 'zygomatic', 'lacrimal', 'ethmoid', 'palatine', 'inferior-concha', 'vomer'],
  att: 'Masseter, buccinator, levator labii superioris, orbicularis oris, nasalis.',
  fact: 'The two maxillae fuse in the midline to form the whole upper jaw; failure to fuse in the womb causes a cleft palate.',
});
add('zygomatic', {
  name: 'Zygomatic bone (cheekbone)', latin: 'Os zygomaticum', type: 'Irregular bone (facial)', short: 'Zygomatic', paired: true,
  size: S(['Height', '≈ 3.5–4 cm'], ['Width', '≈ 3 cm'], ['Bizygomatic width (both sides)', '≈ 13.5 cm']), lenCm: 4,
  fn: 'Shapes the prominence of the cheek, forms the outer wall and part of the floor of the orbit, and links the face to the skull. Its arch is the anchor for the masseter, the strongest chewing muscle.',
  feat: ['Frontal, maxillary and temporal processes', 'Zygomaticofacial foramen', 'Zygomatic arch (with the temporal bone)', 'Orbital surface'],
  art: ['frontal', 'maxilla', 'sphenoid', 'temporal'],
  att: 'Masseter, zygomaticus major and minor.',
  fact: 'Also called the malar bone. The zygomatic arch is the bony bridge you feel in front of your ear.',
});
add('nasal', {
  name: 'Nasal bone', latin: 'Os nasale', type: 'Flat bone (facial)', short: 'Nasal', paired: true,
  size: S(['Length', '≈ 2.5 cm'], ['Width', '≈ 1 cm'], ['Thickness', '1–2 mm']), lenCm: 2.5,
  fn: 'The pair of nasal bones forms the bridge of the nose and supports the cartilage that shapes the rest of it.',
  feat: ['Internal groove for the anterior ethmoidal nerve', 'Thin lower edge, thicker upper edge'],
  art: ['nasal@opp', 'frontal', 'maxilla', 'ethmoid'],
  att: 'Procerus, nasalis (compressor part).',
  fact: 'The nasal bones are the most commonly broken bones of the face.',
});
add('lacrimal', {
  name: 'Lacrimal bone', latin: 'Os lacrimale', type: 'Flat bone (facial)', short: 'Lacrimal', paired: true,
  size: S(['Length', '≈ 1.5 cm'], ['Width', '≈ 1 cm'], ['Thickness', '≈ 1 mm']), lenCm: 1.5,
  fn: 'Forms a small part of the inner wall of the orbit and a groove that holds the tear (lacrimal) sac, which drains tears into the nose.',
  feat: ['Lacrimal groove', 'Posterior lacrimal crest', 'Lacrimal hamulus'],
  art: ['frontal', 'ethmoid', 'maxilla', 'inferior-concha'],
  att: 'Lacrimal part of orbicularis oculi (Horner\'s muscle).',
  fact: 'The smallest and most fragile bone of the face.',
});
add('palatine', {
  name: 'Palatine bone', latin: 'Os palatinum', type: 'Irregular bone (facial)', short: 'Palatine', paired: true,
  size: S(['Height', '≈ 3 cm'], ['Horizontal plate', '≈ 2.5 × 1.5 cm']), lenCm: 3,
  fn: 'An L-shaped bone. The horizontal plate forms the back quarter of the hard palate and the vertical plate forms part of the side wall of the nose and the floor of the orbit.',
  feat: ['Horizontal plate', 'Perpendicular plate', 'Pyramidal process', 'Greater palatine foramen'],
  art: ['maxilla', 'sphenoid', 'ethmoid', 'inferior-concha', 'vomer', 'palatine@opp'],
  att: 'Tensor veli palatini and palatal muscles (soft palate).',
  fact: 'Together with the maxillae, the palatine bones make the roof of the mouth.',
});
add('inferior-concha', {
  name: 'Inferior nasal concha', latin: 'Concha nasalis inferior', type: 'Irregular bone (facial)', short: 'Inf. concha', paired: true,
  size: S(['Length', '≈ 4 cm'], ['Height', '≈ 1 cm'], ['Thickness', '< 1 mm']), lenCm: 4,
  fn: 'A scroll-shaped shelf on the side wall of the nasal cavity. It slows and swirls the air so it is warmed, moistened and filtered before it reaches the lungs.',
  feat: ['Curled free lower edge', 'Maxillary, lacrimal and ethmoidal processes'],
  art: ['maxilla', 'lacrimal', 'ethmoid', 'palatine'],
  att: 'None. Covered by erectile nasal mucosa.',
  fact: 'Unlike the superior and middle conchae, which belong to the ethmoid, the inferior concha is a separate bone.',
});
add('vomer', {
  name: 'Vomer', latin: 'Vomer', type: 'Flat bone (facial)', short: 'Vomer',
  size: S(['Height', '≈ 3.2 cm'], ['Length', '≈ 4 cm'], ['Thickness', '1–2 mm']), lenCm: 4,
  fn: 'A thin plate that forms the lower and back part of the nasal septum, dividing the nasal cavity into left and right airways.',
  feat: ['Ala (wings) on top', 'Groove for the nasopalatine nerve', 'Free posterior border between the two nasal exits (choanae)'],
  art: ['sphenoid', 'ethmoid', 'maxilla*', 'palatine*'],
  att: 'None.',
  fact: 'The name is Latin for "ploughshare", after its shape.',
});
add('mandible', {
  name: 'Mandible (lower jaw)', latin: 'Mandibula', type: 'Irregular bone (facial)', short: 'Mandible',
  size: S(['Width between the angles', '≈ 9.5–10 cm'], ['Ramus height', '≈ 6.5 cm'], ['Body length', '≈ 10 cm'], ['Symphysis height', '≈ 3.2 cm']), lenCm: 10,
  fn: 'The only freely movable bone of the skull. It carries the lower teeth and its hinge and glide at the jaw joint make chewing, speaking and yawning possible.',
  feat: ['Body with alveolar process', 'Ramus, angle and mental protuberance (chin)', 'Condylar process (jaw joint)', 'Coronoid process', 'Mandibular and mental foramina'],
  art: ['temporal*'],
  att: 'Masseter, temporalis, medial and lateral pterygoids, digastric, mylohyoid, geniohyoid, genioglossus, platysma.',
  fact: 'It is the largest, strongest and heaviest bone of the face. The two halves fuse at the chin in the first year of life.',
});

// ---------------- EAR OSSICLES & HYOID ----------------
add('malleus', {
  name: 'Malleus (hammer)', latin: 'Malleus', type: 'Auditory ossicle', short: 'Malleus', paired: true,
  size: S(['Length', '≈ 8 mm'], ['Mass', '≈ 24 mg']), lenCm: 0.8,
  fn: 'The first of the three ear bones. Its handle is fixed to the eardrum and passes sound vibrations to the incus.',
  feat: ['Head', 'Neck', 'Handle (manubrium)', 'Anterior and lateral processes'],
  art: ['incus'],
  att: 'Tensor tympani muscle; eardrum (tympanic membrane).',
  fact: 'The three ossicles reach adult size before birth. They are the smallest bones in the body and sit in the middle ear.',
});
add('incus', {
  name: 'Incus (anvil)', latin: 'Incus', type: 'Auditory ossicle', short: 'Incus', paired: true,
  size: S(['Length', '≈ 7 mm'], ['Mass', '≈ 30 mg']), lenCm: 0.7,
  fn: 'The middle ear bone. It links the malleus to the stapes and carries the vibration across the middle ear.',
  feat: ['Body', 'Short process', 'Long process with the lenticular process'],
  art: ['malleus', 'stapes'],
  att: 'None.',
  fact: 'Together the ossicles work as a lever and concentrate the force of the eardrum on the much smaller oval window, boosting sound pressure roughly twentyfold.',
});
add('stapes', {
  name: 'Stapes (stirrup)', latin: 'Stapes', type: 'Auditory ossicle', short: 'Stapes', paired: true,
  size: S(['Height', '≈ 3.3 mm'], ['Footplate', '≈ 3 × 1.4 mm'], ['Mass', '≈ 3 mg']), lenCm: 0.33,
  fn: 'Its footplate sits in the oval window of the inner ear and pushes the fluid of the cochlea, turning air vibration into fluid waves that we hear as sound.',
  feat: ['Head', 'Anterior and posterior crura (the stirrup arch)', 'Footplate'],
  art: ['incus'],
  att: 'Stapedius muscle (the smallest skeletal muscle).',
  fact: 'The stapes is the smallest and lightest bone in the human body.',
});
add('hyoid', {
  name: 'Hyoid bone', latin: 'Os hyoideum', type: 'Irregular bone', short: 'Hyoid',
  size: S(['Body width', '≈ 2.5–3 cm'], ['Greater horn length', '≈ 3 cm each'], ['Overall width', '≈ 6 cm']), lenCm: 6,
  fn: 'A U-shaped bone in the neck, below the tongue. It anchors the tongue and the muscles used in swallowing and speech and keeps the airway open.',
  feat: ['Body', 'Greater horns (cornua)', 'Lesser horns'],
  art: [],
  att: 'Digastric, mylohyoid, geniohyoid, hyoglossus, stylohyoid, sternohyoid, omohyoid, thyrohyoid, middle pharyngeal constrictor.',
  fact: 'It is the only bone that does not touch another bone. Muscles and ligaments hold it in place.',
});

// ---------------- VERTEBRAE ----------------
const cervCommon = {
  type: 'Vertebra (cervical)',
  fn: 'Supports the head, protects the spinal cord and lets the neck bend and turn. The cervical spine is the most mobile part of the column.',
  feat: ['Small body with uncinate processes', 'Transverse foramina for the vertebral artery', 'Triangular vertebral foramen', 'Short, forked (bifid) spinous process'],
  att: 'Longus colli, scalenes, semispinalis cervicis, multifidus, splenius cervicis, levator scapulae.',
};
add('C1', { ...cervCommon, name: 'C1: Atlas', latin: 'Atlas (vertebra cervicalis I)', short: 'C1 Atlas', size: S(['Width', '≈ 7 cm'], ['Front-to-back', '≈ 4.5 cm'], ['Height', '≈ 2 cm'], ['Canal diameter', '≈ 3 cm']), lenCm: 7,
  fn: 'Carries the skull. Its upper sockets receive the occipital condyles so the head can nod "yes". It has no body, only a ring.',
  feat: ['Ring with anterior and posterior arches', 'Two lateral masses with superior articular facets', 'Transverse foramina', 'Fovea dentis (articulates with the dens)', 'No body and no spinous process'],
  art: ['occipital', 'C2'], att: 'Rectus capitis anterior and lateral, obliquus capitis superior and inferior, levator scapulae.',
  fact: 'Named after Atlas, the Titan who held up the sky.' });
add('C2', { ...cervCommon, name: 'C2: Axis', latin: 'Axis (vertebra cervicalis II)', short: 'C2 Axis', size: S(['Height including dens', '≈ 4.5 cm'], ['Dens', '≈ 1.5 cm tall'], ['Body', '≈ 1.8 × 1.5 cm']), lenCm: 4.5,
  fn: 'Its tooth-like dens is the pivot around which the atlas and skull turn, giving about half of all neck rotation ("no").',
  feat: ['Dens (odontoid process)', 'Large bifid spinous process', 'Superior articular facets on the body', 'Strong lamina and pedicles'],
  art: ['C1', 'C3'], att: 'Rectus capitis posterior major, obliquus capitis inferior, semispinalis cervicis, longus colli.',
  fact: 'The dens was once the body of the atlas, which fused to the axis during development.' });
for (let n = 3; n <= 6; n++) add('C' + n, { ...cervCommon, name: `C${n} vertebra`, latin: `Vertebra cervicalis ${['', '', '', 'III', 'IV', 'V', 'VI'][n]}`, short: 'C' + n,
  fact: n === 6 ? 'The carotid tubercle on C6 is a landmark for compressing the carotid artery and for the cricoid cartilage.' : 'C3 to C6 are called "typical" cervical vertebrae.', art: ['C' + (n - 1), 'C' + (n + 1)] });
add('C7', { ...cervCommon, name: 'C7: Vertebra prominens', latin: 'Vertebra prominens (C VII)', short: 'C7',
  feat: ['Long, non-forked spinous process (felt at the base of the neck)', 'Large transverse processes', 'Small transverse foramen (vein only)', 'Transition to thoracic form'],
  art: ['C6', 'T1'], att: 'Trapezius, rhomboid minor, nuchal ligament, serratus posterior superior.',
  fact: 'Bend your head forward and the bump at the base of your neck is the spinous process of C7.' });

const thorCommon = {
  type: 'Vertebra (thoracic)',
  fn: 'Anchors the ribs to form the chest wall, protects the spinal cord and supports the upper body. Rotation is greater than flexion here because of the ribs.',
  feat: ['Heart-shaped body with costal facets', 'Long transverse processes with costal facets', 'Round vertebral foramen', 'Long spinous process slanting downward'],
  att: 'Erector spinae, multifidus, rotatores, trapezius, rhomboids, latissimus dorsi, serratus posterior, rib heads (costal ligaments).',
};
const thorNote = { 1: 'T1 has a full facet for rib 1 and a half-facet for rib 2.', 10: 'T10 has a single full facet for rib 10.', 11: 'T11 has one facet and no costal facet on the transverse process.', 12: 'T12 is a transition: its upper facets face backward (thoracic) and the lower face outward (lumbar).' };
for (let n = 1; n <= 12; n++) add('T' + n, { ...thorCommon, name: `T${n} vertebra`, latin: `Vertebra thoracica ${n}`, short: 'T' + n,
  feat: n >= 11 ? ['Large body, single costal facet', 'No facet on the short transverse process', 'Round vertebral foramen'] : thorCommon.feat,
  fact: thorNote[n] || (n >= 2 && n <= 9 ? 'T' + n + ' has half-facets (demifacets) on the body for the heads of two ribs.' : ''), art: [n === 1 ? 'C7' : 'T' + (n - 1), n === 12 ? 'L1' : 'T' + (n + 1), 'rib-' + n + '*'] });
const lumCommon = {
  type: 'Vertebra (lumbar)',
  fn: 'The largest vertebrae. They carry most of the body\'s weight, allow bending forward and backward, and protect the lower end of the spinal cord and the nerve roots.',
  feat: ['Massive kidney-shaped body', 'Triangular vertebral foramen', 'Short, blunt, rectangular spinous process', 'Long transverse (costal) processes', 'Mammillary and accessory processes'],
  att: 'Psoas major, quadratus lumborum, erector spinae, multifidus, diaphragm (crura on L1–L3), lumbar fascia.',
};
for (let n = 1; n <= 5; n++) add('L' + n, { ...lumCommon, name: `L${n} vertebra`, latin: `Vertebra lumbalis ${n}`, short: 'L' + n,
  fact: n === 5 ? 'L5 is the largest and lowest mobile vertebra, wedge-shaped, and meets the sacrum at the lumbosacral angle. It is the most common site of slippage (spondylolisthesis).' : n === 1 ? 'The spinal cord itself ends around L1–L2; below that is the cauda equina.' : 'Lumbar vertebrae have no facets for ribs.', art: [n === 1 ? 'T12' : 'L' + (n - 1), n === 5 ? 'sacrum' : 'L' + (n + 1)] });
add('sacrum', {
  name: 'Sacrum', latin: 'Os sacrum', type: 'Irregular bone (fused vertebrae)', short: 'Sacrum',
  size: S(['Length', '≈ 10–11 cm'], ['Width at base', '≈ 10–11 cm'], ['Depth at base', '≈ 4–4.5 cm']), lenCm: 10.5,
  fn: 'Five fused vertebrae form a wedge that locks between the two hip bones. It transfers the weight of the trunk to the pelvis and legs and forms the back wall of the pelvic cavity.',
  feat: ['Promontory (front edge of S1)', 'Alae (wings) and auricular surfaces', 'Four pairs of sacral foramina', 'Median and lateral sacral crests', 'Sacral canal and hiatus'],
  art: ['L5', 'coccyx', 'hip-bone*'],
  att: 'Piriformis, gluteus maximus, erector spinae, multifidus, coccygeus, sacrotuberous and sacrospinous ligaments.',
  fact: 'Its name comes from the Latin os sacrum, "sacred bone". Its wedge shape is why the sacroiliac joints tighten under load.',
});
add('coccyx', {
  name: 'Coccyx (tailbone)', latin: 'Os coccygis', type: 'Irregular bone (fused vertebrae)', short: 'Coccyx',
  size: S(['Length', '≈ 3–4 cm'], ['Segments', '3–5 (usually 4) fused']), lenCm: 3.5,
  fn: 'The remnant of a tail. It anchors pelvic floor muscles and ligaments and acts as a third support point when you sit leaning back.',
  feat: ['First segment with cornua (small horns)', 'Fused tiny vertebrae', 'Slight forward curve'],
  art: ['sacrum'],
  att: 'Gluteus maximus, levator ani, coccygeus, anococcygeal ligament.',
  fact: '"Coccyx" is Greek for cuckoo, because early anatomists thought it looked like a cuckoo\'s beak.',
});

// ---------------- THORAX ----------------
add('sternum', {
  name: 'Sternum (breastbone)', latin: 'Sternum', type: 'Flat bone', short: 'Sternum',
  size: S(['Total length', '≈ 17 cm'], ['Manubrium', '≈ 5 cm long, 5.5 cm wide'], ['Body', '≈ 9.5 cm long, 3.3 cm wide'], ['Xiphoid process', '≈ 2 cm']), lenCm: 17,
  fn: 'The central bone of the chest wall. It anchors the first seven pairs of ribs through their cartilages, shields the heart and great vessels, and carries red marrow used for diagnosis.',
  feat: ['Manubrium with jugular notch and clavicular notches', 'Sternal angle (manubriosternal joint)', 'Body with costal notches', 'Xiphoid process'],
  art: ['clavicle*', 'rib-1*', 'rib-2*', 'rib-3*', 'rib-4*', 'rib-5*', 'rib-6*', 'rib-7*'],
  att: 'Pectoralis major, sternocleidomastoid, sternohyoid, sternothyroid, rectus abdominis (via xiphoid), diaphragm.',
  fact: 'The sternal angle, a palpable ridge, marks the level of the second rib and the carina where the windpipe splits.',
});
const ribText = {
  1: ['First rib', 'Shortest, broadest and most curved rib. It is flat, with upper and lower surfaces, and has grooves for the subclavian vein and artery and the brachial plexus.', 'True rib'],
  2: ['Second rib', 'About twice as long as the first rib. It has a rough area (tuberosity) for the serratus anterior.', 'True rib'],
  10: ['Tenth rib', 'Has a single facet on its head, and its cartilage joins the one above.', 'False rib'],
  11: ['Eleventh rib', 'Short and floating, with no neck or tubercle. It protects the kidney from behind.', 'Floating rib'],
  12: ['Twelfth rib', 'The shortest and lowest rib. It is floating, with no neck or tubercle, and it overlies the kidneys.', 'Floating rib'],
};
for (let i = 1; i <= 12; i++) {
  const t = i <= 7 ? 'True rib' : i <= 10 ? 'False rib' : 'Floating rib';
  const r = ribText[i];
  add('rib-' + i, {
    name: r ? r[0] : `Rib ${i}`, latin: `Costa ${i}`, type: `${t} (${i <= 7 ? 'sternal' : i <= 10 ? 'vertebrochondral' : 'floating'})`, short: 'Rib ' + i,
    size: null, lenCm: [12, 20, 24, 28, 30, 32, 33, 32, 30, 27, 15, 10][i - 1],
    fn: i <= 7 ? 'Forms part of the protective cage around the heart and lungs. Each true rib reaches the sternum directly through its own costal cartilage, and the rib cage expands with every breath.'
      : i <= 10 ? 'Part of the chest wall. Its cartilage joins the cartilage of the rib above rather than reaching the sternum, forming the costal margin.'
      : 'Protects the lower lungs and kidneys. It ends freely in the muscles of the abdominal wall, so it is very mobile and breaks more easily.',
    feat: i === 1 ? ['Flat, with superior and inferior surfaces', 'Scalene tubercle', 'Grooves for subclavian vessels', 'Head with one facet'] : ['Head with facets for the vertebral body', 'Neck and tubercle (joins the transverse process)', 'Angle', 'Shaft with costal groove (nerve and vessels) along the lower edge'],
    art: [i === 1 ? 'T1' : 'T' + (i - 1), 'T' + i, i <= 7 ? 'sternum' : ''].filter(Boolean),
    att: i === 1 ? 'Anterior and middle scalenes, subclavius, serratus anterior, intercostals.' : i >= 11 ? 'Quadratus lumborum, diaphragm, serratus posterior inferior, latissimus dorsi, iliocostalis.' : 'External, internal and innermost intercostals, serratus anterior and posterior, pectoralis, diaphragm, erector spinae.',
    fact: (r && r[1]) || (i === 7 ? 'The seventh rib is usually the longest true rib.' : i === 8 ? 'Ribs 8 to 10 are called "false" because they join the cartilage above rather than the sternum.' : ''),
    desc: r ? r[1] : '',
  });
}

// ---------------- SHOULDER GIRDLE & ARM ----------------
add('clavicle', {
  name: 'Clavicle (collarbone)', latin: 'Clavicula', type: 'Long bone', short: 'Clavicle', paired: true,
  size: S(['Length', '≈ 15 cm (14–16)'], ['Shaft diameter', '≈ 1–1.3 cm']), lenCm: 15,
  fn: 'Holds the shoulder out from the chest so the arm can swing freely. It transmits forces from the arm to the trunk and protects the nerves and vessels going to the arm.',
  feat: ['S-shaped curve', 'Sternal end (to the manubrium)', 'Acromial end (flat, to the scapula)', 'Conoid tubercle and trapezoid line (ligaments)', 'Subclavian groove'],
  art: ['sternum', 'scapula', 'rib-1'],
  att: 'Sternocleidomastoid, pectoralis major, deltoid, trapezius, subclavius, sternohyoid.',
  fact: 'The clavicle is the most frequently fractured bone and the first bone to start ossifying in the embryo, around week 5. It is also the last to finish growing, near age 25.',
});
add('scapula', {
  name: 'Scapula (shoulder blade)', latin: 'Scapula', type: 'Flat bone', short: 'Scapula', paired: true,
  size: S(['Height', '≈ 15–16 cm'], ['Width', '≈ 10–11 cm'], ['Blade thickness', '2–5 mm (thin)']), lenCm: 16,
  fn: 'A triangular plate that glides over the back of the rib cage. It provides the shallow socket (glenoid) of the shoulder joint and a broad base for the muscles that move the arm.',
  feat: ['Glenoid cavity (shoulder socket)', 'Spine of scapula and acromion', 'Coracoid process', 'Medial, lateral and superior borders', 'Superior and inferior angles', 'Suprascapular notch'],
  art: ['humerus', 'clavicle'],
  att: 'Rotator cuff (supraspinatus, infraspinatus, teres minor, subscapularis), deltoid, trapezius, serratus anterior, rhomboids, biceps, triceps, pectoralis minor.',
  fact: 'The scapula is held to the trunk only by muscles, apart from the collarbone joint, which gives the shoulder its huge range of motion.',
});
add('humerus', {
  name: 'Humerus (upper arm bone)', latin: 'Humerus', type: 'Long bone', short: 'Humerus', paired: true,
  size: S(['Length', '≈ 33 cm (29–37)'], ['Head diameter', '≈ 4.7 cm'], ['Shaft diameter', '≈ 2.5–3 cm']), lenCm: 33,
  fn: 'The bone of the upper arm. Its ball-like head fits the shoulder socket and its lower end forms the elbow, so it carries the muscle force that lifts, rotates and bends the arm.',
  feat: ['Head and anatomical neck', 'Greater and lesser tubercles with bicipital groove', 'Surgical neck', 'Deltoid tuberosity', 'Capitulum and trochlea', 'Medial and lateral epicondyles, olecranon fossa'],
  art: ['scapula', 'ulna', 'radius'],
  att: 'Deltoid, rotator cuff, pectoralis major, latissimus dorsi, biceps, brachialis, triceps, brachioradialis, forearm flexors and extensors.',
  fact: 'The "funny bone" is not a bone but the ulnar nerve passing behind the medial epicondyle of the humerus.',
});
add('radius', {
  name: 'Radius', latin: 'Radius', type: 'Long bone', short: 'Radius', paired: true,
  size: S(['Length', '≈ 24 cm (22–26)'], ['Head diameter', '≈ 2.3 cm'], ['Distal end width', '≈ 3.2 cm']), lenCm: 24,
  fn: 'The forearm bone on the thumb side. It carries most of the load at the wrist and rolls around the ulna so the palm can turn up or down.',
  feat: ['Disc-shaped head', 'Radial tuberosity (biceps)', 'Interosseous border', 'Radial styloid process', 'Ulnar notch', 'Dorsal tubercle (of Lister)'],
  art: ['humerus', 'ulna', 'scaphoid', 'lunate'],
  att: 'Biceps brachii, supinator, pronator teres and quadratus, brachioradialis, flexor pollicis longus, abductor pollicis longus.',
  fact: 'A fall on the outstretched hand most often breaks the distal radius (Colles\' fracture).',
});
add('ulna', {
  name: 'Ulna', latin: 'Ulna', type: 'Long bone', short: 'Ulna', paired: true,
  size: S(['Length', '≈ 26 cm (24–28)'], ['Olecranon width', '≈ 2.5 cm'], ['Shaft (mid) diameter', '≈ 1.5 cm']), lenCm: 26,
  fn: 'The forearm bone on the little-finger side. Its trochlear notch hinges on the humerus at the elbow, and it provides a steady column around which the radius rotates.',
  feat: ['Olecranon (point of the elbow)', 'Trochlear notch', 'Coronoid process', 'Radial notch', 'Head and styloid process'],
  art: ['humerus', 'radius'],
  att: 'Triceps, brachialis, flexor carpi ulnaris, flexor digitorum profundus, pronator quadratus, anconeus.',
  fact: 'The olecranon is the lever for the triceps. The ulna is longer than the radius at the elbow end, while the radius is longer at the wrist end.',
});

// ---------------- CARPALS ----------------
const carp = (key, name, latin, size, len, fn, feat, art, fact) => add(key, { name, latin, type: 'Short bone (carpal)', short: name, paired: true, size, lenCm: len, fn, feat, art, att: 'Wrist ligaments, with small muscle attachments from the thenar and hypothenar groups on some carpals.', fact });
carp('scaphoid', 'Scaphoid', 'Os scaphoideum', S(['Length', '≈ 2.5 cm'], ['Width', '≈ 1.2 cm']), 2.5, 'The largest bone of the proximal row. It bridges the two rows of carpal bones and is crucial for wrist movement.', ['Boat-shaped', 'Tubercle (palpable)', 'Mostly covered with cartilage'], ['radius', 'lunate', 'capitate', 'trapezium', 'trapezoid'], 'Its blood supply enters from the far end, so a fracture of the scaphoid often heals poorly or dies (avascular necrosis).');
carp('lunate', 'Lunate', 'Os lunatum', S(['Length', '≈ 1.5 cm'], ['Width', '≈ 1.5 cm']), 1.5, 'Sits in the middle of the proximal row and forms most of the wrist joint with the radius.', ['Half-moon shape', 'Concave distal surface cradling the capitate'], ['radius', 'scaphoid', 'triquetrum', 'capitate', 'hamate'], 'The most commonly dislocated carpal bone.');
carp('triquetrum', 'Triquetrum', 'Os triquetrum', S(['Length', '≈ 1.5 cm'], ['Width', '≈ 1.4 cm']), 1.5, 'The pyramid-shaped bone on the little-finger side of the proximal row. It carries load from the ulnar side of the hand.', ['Pyramidal shape', 'Facet for the pisiform on its palm side'], ['lunate', 'pisiform', 'hamate'], 'Triquetral chip fractures are the second most common carpal fracture.');
carp('pisiform', 'Pisiform', 'Os pisiforme', S(['Diameter', '≈ 1.2 cm']), 1.2, 'A pea-sized sesamoid bone inside a tendon. It acts as a pulley that increases the leverage of flexor carpi ulnaris.', ['Pea-shaped', 'Sits on the front of the triquetrum'], ['triquetrum'], 'It is the smallest carpal bone. "Pisiform" means pea-shaped.');
carp('trapezium', 'Trapezium', 'Os trapezium', S(['Length', '≈ 2 cm'], ['Width', '≈ 1.8 cm']), 2, 'Has a saddle-shaped surface that forms the base of the thumb, giving the thumb its remarkable freedom of movement and opposition.', ['Saddle-shaped distal surface for the first metacarpal', 'Tubercle', 'Groove for flexor carpi radialis'], ['scaphoid', 'trapezoid', 'metacarpal-1', 'metacarpal-2'], 'Osteoarthritis here is the most common cause of pain at the base of the thumb.');
carp('trapezoid', 'Trapezoid', 'Os trapezoideum', S(['Length', '≈ 1.5 cm'], ['Width', '≈ 1.4 cm']), 1.5, 'A wedge of bone in the distal row that anchors the index finger metacarpal.', ['Wedge shape, narrow at the palm', 'Articulates with the second metacarpal'], ['scaphoid', 'trapezium', 'capitate', 'metacarpal-2'], 'It is the smallest carpal bone of the distal row.');
carp('capitate', 'Capitate', 'Os capitatum', S(['Length', '≈ 2.9 cm'], ['Width', '≈ 1.6 cm']), 2.9, 'The largest carpal bone, at the centre of the wrist. It lines up with the middle finger and transmits most of the load of the hand to the forearm.', ['Rounded head fits the lunate and scaphoid', 'Neck and body', 'Articulates mainly with the third metacarpal'], ['scaphoid', 'lunate', 'trapezoid', 'hamate', 'metacarpal-3'], 'Capitate means "head-shaped" in Latin.');
carp('hamate', 'Hamate', 'Os hamatum', S(['Length', '≈ 2.9 cm'], ['Width', '≈ 2 cm']), 2.9, 'Wedge-shaped bone on the little-finger side of the distal row. Its hook protects the ulnar nerve and artery as they pass into the hand.', ['Hook of hamate (palm side)', 'Articulates with the 4th and 5th metacarpals'], ['lunate', 'triquetrum', 'capitate', 'metacarpal-4', 'metacarpal-5'], 'The hook of the hamate can break in golfers and baseball players when the club or bat hits the palm.');

// ---------------- METACARPALS & FINGERS ----------------
const MC = { 1: [4.4, 'thumb'], 2: [6.5, 'index finger'], 3: [6.4, 'middle finger'], 4: [5.5, 'ring finger'], 5: [5.2, 'little finger'] };
for (let n = 1; n <= 5; n++) add('metacarpal-' + n, {
  name: `Metacarpal ${n}`, latin: `Os metacarpale ${['', 'I', 'II', 'III', 'IV', 'V'][n]}`, type: 'Long bone (miniature)', short: 'MC' + n, paired: true,
  size: S(['Length', `≈ ${MC[n][0]} cm`], ['Shaft diameter', '≈ 0.9–1.1 cm']), lenCm: MC[n][0],
  fn: `Forms the palm behind the ${MC[n][1]}. ${n === 1 ? 'It is the most mobile, thick and short, and swings across the palm for gripping and pinching.' : 'Its base fits a carpal bone and its rounded head forms a knuckle at the metacarpophalangeal joint.'}`,
  feat: ['Base', 'Shaft (curved)', 'Head (the knuckle)'], art: n === 1 ? ['trapezium', 'finger-1-prox'] : ['finger-' + n + '-prox', ...({ 2: ['trapezium', 'trapezoid', 'capitate', 'metacarpal-3'], 3: ['capitate', 'metacarpal-2', 'metacarpal-4'], 4: ['capitate', 'hamate', 'metacarpal-3', 'metacarpal-5'], 5: ['hamate', 'metacarpal-4'] })[n]],
  att: 'Interossei, extensor and flexor carpi tendons' + (n === 1 ? ', opponens pollicis, first dorsal interosseous.' : '.'),
  fact: n === 5 ? 'A punch that breaks the neck of the fifth metacarpal is known as a "boxer\'s fracture".' : n === 1 ? 'The thumb metacarpal has the largest range of motion of any metacarpal.' : 'The knuckles you see when you make a fist are the heads of the metacarpals.',
});
const PHL = { prox: 'proximal', mid: 'middle', dist: 'distal' };
const FL = { 1: [3.0, null, 2.4], 2: [4.0, 2.4, 2.0], 3: [4.5, 2.8, 2.2], 4: [4.2, 2.6, 2.1], 5: [3.3, 1.8, 1.8] };
const FN = { 1: 'Thumb', 2: 'Index finger', 3: 'Middle finger', 4: 'Ring finger', 5: 'Little finger' };
for (let n = 1; n <= 5; n++) for (const c of ['prox', 'mid', 'dist']) { if (n === 1 && c === 'mid') continue; const L = FL[n][c === 'prox' ? 0 : c === 'mid' ? 1 : 2];
  add(`finger-${n}-${c}`, {
    name: `${FN[n]}: ${PHL[c]} phalanx`, latin: `Phalanx ${PHL[c] === 'proximal' ? 'proximalis' : PHL[c] === 'middle' ? 'media' : 'distalis'} (digitus ${n})`, type: 'Long bone (miniature)', short: `${['', 'Thumb', 'Index', 'Middle', 'Ring', 'Little'][n]} ${c}`, paired: true,
    size: S(['Length', `≈ ${L} cm`], ['Shaft width', c === 'dist' ? '≈ 0.5–0.6 cm' : '≈ 0.7–0.9 cm']), lenCm: L,
    fn: c === 'prox' ? 'The longest bone of the finger. Its base meets the knuckle (metacarpal head) and its head forms the first finger joint (PIP).' : c === 'mid' ? 'The middle link of the finger, between the PIP and DIP joints. The thumb has no middle phalanx.' : 'The fingertip bone. Its flared tuft supports the nail bed and the sensitive pulp of the fingertip.',
    feat: c === 'dist' ? ['Base', 'Shaft', 'Distal tuft (supports the nail)'] : ['Base (concave)', 'Shaft (flat on the palm side)', 'Head (two condyles, pulley shaped)'],
    art: c === 'prox' ? [n === 1 ? 'metacarpal-1' : 'metacarpal-' + n, n === 1 ? 'finger-1-dist' : `finger-${n}-mid`] : c === 'mid' ? [`finger-${n}-prox`, `finger-${n}-dist`] : [n === 1 ? 'finger-1-prox' : `finger-${n}-mid`],
    att: c === 'dist' ? 'Flexor digitorum profundus (palm side), extensor tendon (back side).' : 'Flexor and extensor tendons, interossei and lumbricals.',
    fact: 'Each hand has 14 phalanges, 3 per finger and 2 for the thumb.' });
}

// ---------------- PELVIS & LEG ----------------
add('hip-bone', {
  name: 'Hip bone (os coxae)', latin: 'Os coxae', type: 'Irregular bone (fused ilium, ischium, pubis)', short: 'Hip bone', paired: true,
  size: S(['Height (crest to ischial tuberosity)', '≈ 21–22 cm'], ['Iliac wing breadth', '≈ 18–20 cm'], ['Acetabulum diameter', '≈ 5.3 cm']), lenCm: 22,
  fn: 'Each hip bone forms half of the pelvis. It carries the weight of the trunk to the legs, provides the deep socket of the hip joint and protects the pelvic organs.',
  feat: ['Ilium: wing, crest, ASIS, PSIS', 'Ischium: tuberosity (sitting bone), spine', 'Pubis: rami and symphysis', 'Acetabulum (hip socket)', 'Obturator foramen', 'Greater sciatic notch'],
  art: ['sacrum', 'hip-bone@opp', 'femur'],
  att: 'Gluteus maximus, medius and minimus, iliopsoas, rectus femoris, hamstrings, adductors, sartorius, abdominal wall muscles.',
  fact: 'At birth each hip bone is three separate bones (ilium, ischium and pubis) that fuse at the acetabulum around puberty.',
});
add('femur', {
  name: 'Femur (thigh bone)', latin: 'Os femoris', type: 'Long bone', short: 'Femur', paired: true,
  size: S(['Length', '≈ 48 cm (43–53)'], ['Head diameter', '≈ 4.8 cm'], ['Shaft diameter', '≈ 2.8 cm'], ['Neck-shaft angle', '≈ 125°']), lenCm: 48,
  fn: 'The longest, heaviest and strongest bone in the body. It transmits body weight from the hip to the knee and provides leverage for the large muscles of the thigh.',
  feat: ['Head (fits the acetabulum)', 'Neck', 'Greater and lesser trochanters', 'Linea aspera', 'Medial and lateral condyles', 'Patellar surface and intercondylar notch'],
  art: ['hip-bone', 'tibia', 'patella'],
  att: 'Gluteals, iliopsoas, quadriceps, adductors, hamstrings (short head of biceps), gastrocnemius.',
  fact: 'A femur is about a quarter of a person\'s height, and can withstand a load of several times body weight.',
});
add('patella', {
  name: 'Patella (kneecap)', latin: 'Patella', type: 'Sesamoid bone', short: 'Patella', paired: true,
  size: S(['Height', '≈ 4.5 cm'], ['Width', '≈ 4.5–5 cm'], ['Thickness', '≈ 2.2 cm']), lenCm: 4.5,
  fn: 'The largest sesamoid bone. It sits inside the quadriceps tendon and increases the leverage of the thigh muscles while protecting the front of the knee joint.',
  feat: ['Base (top)', 'Apex (bottom)', 'Posterior articular surface with medial and lateral facets', 'Rough anterior surface'],
  art: ['femur'],
  att: 'Quadriceps tendon (base), patellar ligament (apex), retinacula.',
  fact: 'It is not present at birth. The patella ossifies between ages 3 and 6.',
});
add('tibia', {
  name: 'Tibia (shin bone)', latin: 'Tibia', type: 'Long bone', short: 'Tibia', paired: true,
  size: S(['Length', '≈ 38.5 cm (36–41)'], ['Plateau width', '≈ 7.5 cm'], ['Shaft diameter', '≈ 2.7 cm']), lenCm: 38.5,
  fn: 'The weight-bearing bone of the lower leg. It receives the full load from the femur at the knee and passes it to the talus at the ankle.',
  feat: ['Medial and lateral tibial plateaus', 'Intercondylar eminence', 'Tibial tuberosity', 'Anterior crest (shin)', 'Medial malleolus', 'Fibular notch'],
  art: ['femur', 'fibula', 'talus'],
  att: 'Quadriceps (patellar ligament), sartorius, gracilis, semitendinosus, semimembranosus, tibialis anterior and posterior, popliteus.',
  fact: 'The anterior crest is just under the skin and is the part you feel when you knock your shin.',
});
add('fibula', {
  name: 'Fibula', latin: 'Fibula', type: 'Long bone', short: 'Fibula', paired: true,
  size: S(['Length', '≈ 37 cm'], ['Shaft diameter', '≈ 1.2–1.5 cm']), lenCm: 37,
  fn: 'A slender bone beside the tibia. It carries little body weight but anchors muscles and forms the outer side of the ankle mortise, which stabilises the joint.',
  feat: ['Head', 'Neck (common fibular nerve)', 'Shaft with interosseous crest', 'Lateral malleolus'],
  art: ['tibia', 'talus'],
  att: 'Biceps femoris, fibularis longus, brevis and tertius, soleus, tibialis posterior, extensors of the toes.',
  fact: 'The fibula is the most slender long bone for its length and is often used as a donor bone in reconstructive surgery.',
});

// ---------------- TARSALS ----------------
const tars = (key, name, latin, size, len, fn, feat, art, fact, type = 'Short bone (tarsal)') => add(key, { name, latin, type, short: name, paired: true, size, lenCm: len, fn, feat, art, att: 'Ligaments of the ankle and foot arches; tendons of nearby foot muscles.', fact });
tars('talus', 'Talus (ankle bone)', 'Talus', S(['Length', '≈ 5.5–6 cm'], ['Width', '≈ 4.2 cm'], ['Height', '≈ 3.5 cm']), 5.8, 'Links the leg and the foot. It receives the body weight from the tibia and spreads it forward and backward to the rest of the foot. No muscles attach to it.', ['Trochlea (dome)', 'Neck and head', 'Lateral and posterior processes'], ['tibia', 'fibula', 'calcaneus', 'navicular'], 'About 60% of its surface is covered with cartilage, and it has no muscle attachments.');
tars('calcaneus', 'Calcaneus (heel bone)', 'Calcaneus', S(['Length', '≈ 8 cm'], ['Width', '≈ 4 cm'], ['Height', '≈ 5 cm']), 8, 'The largest tarsal bone. It forms the heel, takes the first impact of walking and gives the Achilles tendon a lever.', ['Calcaneal tuberosity (heel)', 'Sustentaculum tali', 'Posterior, middle and anterior facets for the talus', 'Peroneal trochlea'], ['talus', 'cuboid'], 'It is the largest tarsal bone and the most commonly fractured one, usually after a fall from height.');
tars('navicular', 'Navicular', 'Os naviculare', S(['Width', '≈ 3 cm'], ['Height', '≈ 2.5 cm'], ['Thickness', '≈ 2 cm']), 3, 'A boat-shaped bone on the inner side of the foot. It forms the keystone of the medial arch.', ['Concave facet for the head of the talus', 'Navicular tuberosity (palpable)', 'Three facets for the cuneiforms'], ['talus', 'cuneiform-medial', 'cuneiform-intermediate', 'cuneiform-lateral', 'cuboid'], '"Navicular" means "little boat".');
tars('cuboid', 'Cuboid', 'Os cuboideum', S(['Width', '≈ 2.5–3 cm'], ['Length', '≈ 3 cm'], ['Height', '≈ 2.5 cm']), 3, 'A box-shaped bone on the outer side of the foot that supports the lateral arch and guides a groove for the fibularis longus tendon.', ['Groove for fibularis longus', 'Facets for the 4th and 5th metatarsals'], ['calcaneus', 'navicular', 'cuneiform-lateral', 'metatarsal-4', 'metatarsal-5'], 'Its name comes from its cube-like form.');
tars('cuneiform-medial', 'Medial cuneiform', 'Os cuneiforme mediale', S(['Length', '≈ 3.5 cm'], ['Width', '≈ 1.8 cm']), 3.5, 'The largest cuneiform. It supports the big toe metatarsal and is the attachment of tibialis anterior and fibularis longus.', ['Wedge shaped, base down'], ['navicular', 'cuneiform-intermediate', 'metatarsal-1', 'metatarsal-2'], 'A cuneiform is a wedge-shaped bone; the three cuneiforms form the transverse arch.');
tars('cuneiform-intermediate', 'Intermediate cuneiform', 'Os cuneiforme intermedium', S(['Length', '≈ 2 cm'], ['Width', '≈ 2 cm']), 2, 'The smallest cuneiform. It lies between the other two, and its base up creates the recess that locks the second metatarsal.', ['Wedge shaped, base up'], ['navicular', 'cuneiform-medial', 'cuneiform-lateral', 'metatarsal-2'], 'Locking the second metatarsal into this recess is what gives the midfoot its stability (the Lisfranc joint).');
tars('cuneiform-lateral', 'Lateral cuneiform', 'Os cuneiforme laterale', S(['Length', '≈ 2.5 cm'], ['Width', '≈ 2 cm']), 2.5, 'The central wedge of the midfoot. It supports the third metatarsal and forms part of the transverse arch.', ['Wedge shaped'], ['navicular', 'cuneiform-intermediate', 'cuboid', 'metatarsal-2', 'metatarsal-3', 'metatarsal-4'], 'It is a place where part of the tibialis posterior tendon attaches.');

// ---------------- METATARSALS & TOES ----------------
const MT = { 1: [6.2, 'big toe'], 2: [7.4, 'second toe'], 3: [6.9, 'third toe'], 4: [6.6, 'fourth toe'], 5: [6.0, 'little toe'] };
for (let n = 1; n <= 5; n++) add('metatarsal-' + n, {
  name: `Metatarsal ${n}`, latin: `Os metatarsale ${['', 'I', 'II', 'III', 'IV', 'V'][n]}`, type: 'Long bone (miniature)', short: 'MT' + n, paired: true,
  size: S(['Length', `≈ ${MT[n][0]} cm`], ['Shaft diameter', n === 1 ? '≈ 1.4 cm' : '≈ 0.8–0.9 cm']), lenCm: MT[n][0],
  fn: n === 1 ? 'The shortest, thickest metatarsal. It carries about half the load of the forefoot in push-off and underlies the ball of the big toe.' : `Part of the arch of the foot behind the ${MT[n][1]}. It bears weight in standing and walking, and acts as a lever as you push off.`,
  feat: n === 5 ? ['Tuberosity at the base (fibularis brevis)', 'Shaft', 'Head'] : n === 1 ? ['Broad base', 'Thick shaft', 'Head with two sesamoid grooves'] : ['Base', 'Shaft', 'Head'],
  art: n === 1 ? ['cuneiform-medial', 'toe-1-prox'] : [`toe-${n}-prox`, ...({ 2: ['cuneiform-medial', 'cuneiform-intermediate', 'cuneiform-lateral'], 3: ['cuneiform-lateral'], 4: ['cuboid', 'cuneiform-lateral'], 5: ['cuboid'] })[n]],
  att: n === 5 ? 'Fibularis brevis and tertius, plantar fascia.' : 'Interossei, adductor hallucis, fibularis longus, tibialis anterior and posterior.',
  fact: n === 5 ? 'The "Jones fracture" occurs at the base of the fifth metatarsal.' : n === 2 ? 'The second metatarsal is the longest and is the most common site of stress ("march") fractures.' : 'The heads of the metatarsals form the ball of the foot.',
});
const TL = { 1: [3.0, null, 2.4], 2: [2.5, 1.3, 1.1], 3: [2.4, 1.25, 1.0], 4: [2.2, 1.1, 0.95], 5: [1.9, 0.95, 0.85] };
const TN = { 1: 'Big toe (hallux)', 2: 'Second toe', 3: 'Third toe', 4: 'Fourth toe', 5: 'Little toe' };
for (let n = 1; n <= 5; n++) for (const c of ['prox', 'mid', 'dist']) { if (n === 1 && c === 'mid') continue; const L = TL[n][c === 'prox' ? 0 : c === 'mid' ? 1 : 2];
  add(`toe-${n}-${c}`, {
    name: `${TN[n]}: ${PHL[c]} phalanx`, latin: `Phalanx ${PHL[c] === 'proximal' ? 'proximalis' : PHL[c] === 'middle' ? 'media' : 'distalis'} (digitus pedis ${n})`, type: 'Long bone (miniature)', short: `${['', 'Hallux', '2nd toe', '3rd toe', '4th toe', '5th toe'][n]} ${c}`, paired: true,
    size: S(['Length', `≈ ${L} cm`], ['Width', n === 1 ? '≈ 1.5–1.8 cm' : '≈ 0.6–0.9 cm']), lenCm: L,
    fn: n === 1 ? 'The big toe has only two phalanges. It is the strongest toe and takes a large share of the load when you push off.' : c === 'prox' ? 'The longest phalanx of the toe, bridging the ball of the foot and the first toe joint.' : c === 'mid' ? 'A short middle link of the toe. In the little toe it is often fused with the distal phalanx.' : 'The tip of the toe, supporting the nail and the pad.',
    feat: c === 'dist' ? ['Base', 'Shaft', 'Tuft'] : ['Base', 'Shaft', 'Head'],
    art: c === 'prox' ? ['metatarsal-' + n, n === 1 ? 'toe-1-dist' : `toe-${n}-mid`] : c === 'mid' ? [`toe-${n}-prox`, `toe-${n}-dist`] : [n === 1 ? 'toe-1-prox' : `toe-${n}-mid`],
    att: 'Flexor and extensor tendons, interossei and lumbricals of the foot.',
    fact: 'Toes help with balance and push-off; the big toe alone gives about 40% of the push-off power in walking.' });
}
// fix: large claim removed for accuracy
for (let n = 1; n <= 5; n++) for (const c of ['prox', 'mid', 'dist']) { const k = `toe-${n}-${c}`; if (INFO[k]) INFO[k].fact = 'The toes help balance the body and add stability when you push off from the ground.'; }
for (let n = 1; n <= 5; n++) for (const c of ['prox', 'mid', 'dist']) { const k = `finger-${n}-${c}`; if (INFO[k]) INFO[k].fact = 'Each hand has 14 phalanges: three for each finger and two for the thumb.'; }

export const REGIONS = ['Skull', 'Vertebral column', 'Thorax', 'Shoulder girdle', 'Upper limb', 'Pelvic girdle', 'Lower limb'];
export const REGION_COLORS = { 'Skull': '#e8c9a0', 'Vertebral column': '#a9c8e8', 'Thorax': '#bfe0c3', 'Shoulder girdle': '#e8b4c0', 'Upper limb': '#e6d28f', 'Pelvic girdle': '#c8b0e8', 'Lower limb': '#9fd8d0' };
