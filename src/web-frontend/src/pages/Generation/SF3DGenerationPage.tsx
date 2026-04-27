import React from 'react'
import { MultiModelGenerationPage } from './MultiModelGenerationPage'

export function SF3DGenerationPage() {
  return (
    <MultiModelGenerationPage
      title="SF3D - Stability AI"
      model="sf3d"
      apiEndpoint="sf3d"
      mockTime={500}
      description="速度与质量的完美平衡 - 极速高质量3D生成"
      githubUrl="https://github.com/Stability-AI/generative-models"
      specs={{
        speed: '~0.5秒',
        memory: '9GB',
        license: 'Apache-2.0'
      }}
    />
  )
}
