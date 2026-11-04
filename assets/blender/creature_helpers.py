# Helpers used to build the creature GLBs in Blender 5.2 (run inside Blender).

import bpy, bmesh, math
from mathutils import Vector

def clear_scene():
    scn = bpy.context.scene
    for o in list(scn.objects):
        bpy.data.objects.remove(o, do_unlink=True)

def make_material(name, base, belly, rough=0.75):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    # vertex colour (countershading) multiplies base colour
    attr = next((n for n in nt.nodes if n.type == 'VERTEX_COLOR'), None) or nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Col'
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    mat['base'] = base; mat['belly'] = belly
    return mat

def build_creature(name, nodes, edges, root, subdiv=2, target_tris=5000, base=(0.3,0.3,0.25), belly=(0.7,0.65,0.5), stripes=None):
    """nodes: {key: (x,y,z, rx, ry)} in metres, facing -Y, Z up, feet at z=0. edges: [(a,b)] parent->child."""
    keys = list(nodes.keys())
    idx = {k:i for i,k in enumerate(keys)}
    me = bpy.data.meshes.new(name+"_skel")
    me.from_pydata([Vector(nodes[k][:3]) for k in keys], [(idx[a], idx[b]) for a,b in edges], [])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True)
    sk = ob.modifiers.new("Skin", 'SKIN')
    sk.use_smooth_shade = True
    sk.branch_smoothing = 0.6
    for k in keys:
        v = ob.data.skin_vertices[0].data[idx[k]]
        v.radius = (nodes[k][3], nodes[k][4])
        v.use_root = (k == root)
    sub = ob.modifiers.new("Sub", 'SUBSURF'); sub.levels = subdiv; sub.render_levels = subdiv
    bpy.ops.object.modifier_apply(modifier="Skin")
    bpy.ops.object.modifier_apply(modifier="Sub")
    tris = sum(len(p.vertices)-2 for p in ob.data.polygons)
    if tris > target_tris:
        dec = ob.modifiers.new("Dec", 'DECIMATE'); dec.ratio = target_tris / tris
        bpy.ops.object.modifier_apply(modifier="Dec")
    bpy.ops.object.shade_smooth()
    paint(ob, base, belly, stripes)
    ob.data.materials.append(make_material(name+"_mat", base, belly))
    return ob

def paint(ob, base, belly, stripes):
    me = ob.data
    if "Col" not in me.color_attributes:
        me.color_attributes.new("Col", 'FLOAT_COLOR', 'POINT')
    col = me.color_attributes["Col"]
    zs = [v.co.z for v in me.vertices]; zmin, zmax = min(zs), max(zs)
    for v in me.vertices:
        n = v.normal
        t = max(0.0, min(1.0, 0.5 - n.z*0.6))           # underside → belly colour
        c = [base[i]*(1-t) + belly[i]*t for i in range(3)]
        if stripes:
            s = 0.5 + 0.5*math.sin(v.co.y*stripes[0])
            k = stripes[1] * s * max(0.0, n.z)           # stripes only on the back
            c = [c[i]*(1-k) for i in range(3)]
        col.data[v.index].color = (*c, 1.0)

def build_armature(name, nodes, edges, mesh_ob):
    arm = bpy.data.armatures.new(name+"_rig")
    rig = bpy.data.objects.new(name+"_rig", arm)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    bones = {}
    for a,b in edges:
        bn = arm.edit_bones.new(b)
        bn.head = Vector(nodes[a][:3]); bn.tail = Vector(nodes[b][:3])
        bones[b] = (bn, a)
    for b,(bn,a) in bones.items():
        if a in bones: bn.parent = bones[a][0]; bn.use_connect = True
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in bpy.context.selected_objects: o.select_set(False)
    mesh_ob.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    return rig

def animate(rig, action_name, frames, channels):
    """channels: {bone: [(axis, amplitude_deg, phase_cycles)]}. One looping cycle of `frames`."""
    rig.animation_data_create()
    act = bpy.data.actions.new(action_name)
    rig.animation_data.action = act
    for pb in rig.pose.bones: pb.rotation_mode = 'XYZ'
    steps = 8
    for s in range(steps+1):
        f = 1 + frames * s / steps
        ph = s / steps
        for bone, specs in channels.items():
            pb = rig.pose.bones.get(bone)
            if not pb: continue
            rot = [0.0,0.0,0.0]
            for axis, amp, phase in specs:
                rot["XYZ".index(axis)] += math.radians(amp) * math.sin(2*math.pi*(ph + phase))
            pb.rotation_euler = rot
            pb.keyframe_insert("rotation_euler", frame=f)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = frames + 1
    return act

def export_glb(objs, path):
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
        export_yup=True, export_apply=False, export_animations=True, export_skins=True,
        export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_materials='EXPORT')
