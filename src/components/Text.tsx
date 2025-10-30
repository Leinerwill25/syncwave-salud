'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
	size?: 'sm' | 'base' | 'lg';
	weight?: 'normal' | 'medium' | 'semibold' | 'bold';
	color?: 'default' | 'muted' | 'primary' | 'secondary';
}

export function Text({ children, className, size = 'base', weight = 'normal', color = 'default', ...props }: TextProps) {
	const sizeClasses = {
		sm: 'text-sm',
		base: 'text-base',
		lg: 'text-lg',
	}[size];

	const weightClasses = {
		normal: 'font-normal',
		medium: 'font-medium',
		semibold: 'font-semibold',
		bold: 'font-bold',
	}[weight];

	const colorClasses = {
		default: 'text-foreground',
		muted: 'text-muted-foreground',
		primary: 'text-primary',
		secondary: 'text-secondary',
	}[color];

	return (
		<p className={cn(sizeClasses, weightClasses, colorClasses, className)} {...props}>
			{children}
		</p>
	);
}
