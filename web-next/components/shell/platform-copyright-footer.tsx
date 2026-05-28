import React from 'react';
import { cn } from '../../lib/utils';

type PlatformCopyrightFooterProps = React.HTMLAttributes<HTMLElement> & {
  className?: string;
  innerClassName?: string;
  headlineClassName?: string;
  lineClassName?: string;
  linkClassName?: string;
  version?: string | null;
};

export function PlatformCopyrightFooter({
  className,
  innerClassName,
  headlineClassName,
  lineClassName,
  linkClassName,
  version,
  ...props
}: PlatformCopyrightFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={className} {...props}>
      <div className={innerClassName}>
        <div className={headlineClassName}>
          Apache HertzBeat™{version ? ` ${version}` : ''}
        </div>
        <div className={lineClassName}>
          Copyright &copy; {currentYear}{' '}
          <a href="https://hertzbeat.apache.org" target="_blank" rel="noreferrer" className={cn('underline-offset-2 hover:underline', linkClassName)}>
            Apache HertzBeat™
          </a>
        </div>
      </div>
    </footer>
  );
}
