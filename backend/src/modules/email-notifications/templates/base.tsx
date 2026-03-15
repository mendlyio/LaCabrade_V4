import { Html, Body, Container, Preview, Tailwind, Head } from '@react-email/components'
import * as React from 'react'

interface BaseProps {
  preview?: string
  children: React.ReactNode
}

export const Base: React.FC<BaseProps> = ({ preview, children }) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="my-auto mx-auto font-sans px-2" style={{ backgroundColor: '#f4f4f5' }}>
          <Container style={{
            border: '1px solid #e5e7eb',
            borderTop: '4px solid #92400E',
            borderRadius: '8px',
            margin: '40px auto',
            padding: '32px 24px',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          }}>
            <div style={{ maxWidth: '100%', wordBreak: 'break-word' as const }}>
              {children}
            </div>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
