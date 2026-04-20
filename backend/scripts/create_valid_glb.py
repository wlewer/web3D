"""
Generate a minimal valid GLB file with a simple cube geometry.
This creates a proper binary GLB file that can be loaded by any 3D viewer.
"""
import struct
import json
import os

def create_minimal_glb(output_path: str):
    """
    Create a minimal GLB file with a simple cube.
    
    GLB format:
    - Header (12 bytes): magic + version + length
    - JSON chunk: length + type('JSON') + JSON data (padded to 4 bytes)
    - BIN chunk: length + type('BIN') + binary data (padded to 4 bytes)
    """
    
    # Cube vertices (x, y, z) - 8 vertices
    vertices = [
        -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5,  0.5, -0.5,  -0.5,  0.5, -0.5,  # bottom
        -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,  # top
    ]
    
    # Vertex normals (same count as vertices)
    normals = [
        0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  # front
        0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  # back
    ]
    
    # Indices (36 indices for 12 triangles - 6 faces * 2 triangles each)
    indices = [
        # Front face
        0, 1, 2,  0, 2, 3,
        # Back face
        4, 6, 5,  4, 7, 6,
        # Top face
        3, 2, 6,  3, 6, 7,
        # Bottom face
        0, 5, 1,  0, 4, 5,
        # Right face
        1, 5, 6,  1, 6, 2,
        # Left face
        0, 3, 7,  0, 7, 4,
    ]
    
    # Convert to binary
    indices_bytes = struct.pack('<' + 'I' * len(indices), *indices)
    vertices_bytes = struct.pack('<' + 'f' * len(vertices), *vertices)
    normals_bytes = struct.pack('<' + 'f' * len(normals), *normals)
    
    # Pad binary data to 4-byte alignment
    bin_padding = (4 - (len(indices_bytes) + len(vertices_bytes) + len(normals_bytes)) % 4) % 4
    
    # GLTF JSON structure
    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "Python Minimal GLB Generator"
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{
            "primitives": [{
                "attributes": {
                    "POSITION": 0,
                    "NORMAL": 1
                },
                "indices": 2,
                "mode": 4  # TRIANGLES
            }]
        }],
        "accessors": [
            {  # Position accessor
                "bufferView": 0,
                "componentType": 5126,  # FLOAT
                "count": 8,
                "type": "VEC3",
                "max": [0.5, 0.5, 0.5],
                "min": [-0.5, -0.5, -0.5]
            },
            {  # Normal accessor
                "bufferView": 1,
                "componentType": 5126,  # FLOAT
                "count": 8,
                "type": "VEC3"
            },
            {  # Index accessor
                "bufferView": 2,
                "componentType": 5123,  # UNSIGNED_SHORT
                "count": 36,
                "type": "SCALAR"
            }
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(vertices_bytes)},  # positions
            {"buffer": 0, "byteOffset": len(vertices_bytes), "byteLength": len(normals_bytes)},  # normals
            {"buffer": 0, "byteOffset": len(vertices_bytes) + len(normals_bytes), "byteLength": len(indices_bytes)},  # indices
        ],
        "buffers": [{
            "byteLength": len(vertices_bytes) + len(normals_bytes) + len(indices_bytes) + bin_padding
        }]
    }
    
    # Serialize JSON
    json_str = json.dumps(gltf_json, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    
    # Pad JSON to 4-byte alignment
    json_padding = (4 - len(json_bytes) % 4) % 4
    json_bytes_padded = json_bytes + b' ' * json_padding
    
    # Combine binary data
    bin_data = vertices_bytes + normals_bytes + indices_bytes + b'\x00' * bin_padding
    
    # Calculate total length
    # Header: 12 bytes
    # JSON chunk: 8 (header) + json_bytes_padded
    # BIN chunk: 8 (header) + bin_data
    total_length = 12 + (8 + len(json_bytes_padded)) + (8 + len(bin_data))
    
    # Build GLB
    glb = bytearray()
    
    # Header
    glb.extend(b'glTF')  # magic
    glb.extend(struct.pack('<I', 2))  # version
    glb.extend(struct.pack('<I', total_length))  # total length
    
    # JSON chunk
    glb.extend(struct.pack('<I', len(json_bytes_padded)))  # chunk length
    glb.extend(b'JSON')  # chunk type
    glb.extend(json_bytes_padded)
    
    # BIN chunk
    glb.extend(struct.pack('<I', len(bin_data)))  # chunk length
    glb.extend(b'BIN\x00')  # chunk type
    glb.extend(bin_data)
    
    # Write to file
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(bytes(glb))
    
    print(f"✓ Created valid GLB file: {output_path}")
    print(f"  Size: {len(glb)} bytes")
    print(f"  Vertices: 8")
    print(f"  Indices: 36 (12 triangles)")
    print(f"  Format: glTF 2.0 (GLB)")

if __name__ == "__main__":
    output = os.path.join(os.path.dirname(__file__), 'assets', 'example.glb')
    create_minimal_glb(output)
