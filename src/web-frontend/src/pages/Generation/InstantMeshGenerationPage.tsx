import React from 'react'
import { MultiModelGenerationPage } from './MultiModelGenerationPage'

export function InstantMeshGenerationPage() {
  return (
    <MultiModelGenerationPage
      title="InstantMesh - Tencent ARC"
      model="instantmesh"
      apiEndpoint="instantmesh"
      mockTime={15000}
      description="精细网格生成 - 高质量纹理，适合专业项目"
      githubUrl="https://github.com/TencentARC/InstantMesh"
      specs={{
        speed: '10-25秒',
        memory: '8-12GB',
        license: '待确认'
      }}
    />
  )
}
