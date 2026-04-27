import React from 'react'
import { MultiModelGenerationPage } from './MultiModelGenerationPage'

export function TripoSRGenerationPage() {
  return (
    <MultiModelGenerationPage
      title="TripoSR - VAST-AI"
      model="triposr"
      apiEndpoint="triposr"
      mockTime={800}
      description="超快概念验证 - 适合批量处理和快速原型"
      githubUrl="https://github.com/VAST-AI-Research/TripoSR"
      specs={{
        speed: '<1秒',
        memory: '4-6GB',
        license: 'MIT'
      }}
    />
  )
}
