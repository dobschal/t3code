import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type {
  EnvironmentId,
  Pipeline,
  PipelineStatus,
  ProjectId,
  PullRequestCheckStatus,
  ThreadId,
} from "@t3tools/contracts";
import type { MouseEvent } from "react";

import { useOpenLink } from "../../browser/useOpenLink";
import { pullRequestEnvironment } from "../../state/pullRequests";
import { useEnvironmentQuery } from "../../state/query";
import { PullRequestCheckStatusIcon } from "../pullRequest/pullRequestPresentation";
import { RelativeTime } from "../RelativeTime";
import { toastManager } from "../ui/toast";
import { ThreadDetailsControl } from "./ThreadDetailsControl";
import { ThreadDetailsSection } from "./ThreadDetailsSection";

const PIPELINE_STATUS_PRESENTATION = {
  created: { label: "Created", check: "pending" },
  waiting_for_resource: { label: "Waiting for resource", check: "pending" },
  preparing: { label: "Preparing", check: "pending" },
  pending: { label: "Pending", check: "pending" },
  running: { label: "Running", check: "pending" },
  scheduled: { label: "Scheduled", check: "neutral" },
  manual: { label: "Manual", check: "action-required" },
  success: { label: "Passed", check: "success" },
  failed: { label: "Failed", check: "failure" },
  canceled: { label: "Canceled", check: "cancelled" },
  skipped: { label: "Skipped", check: "skipped" },
} as const satisfies Record<PipelineStatus, { label: string; check: PullRequestCheckStatus }>;

// Merge request pipelines run on refs/merge-requests/<iid>/head (or /merge, /train).
const MERGE_REQUEST_REF = /^refs\/merge-requests\/(\d+)\/\w+$/u;

function pipelineRefLabel(pipeline: Pipeline): string {
  const mergeRequest = MERGE_REQUEST_REF.exec(pipeline.ref)?.[1];
  if (mergeRequest !== undefined) return `!${mergeRequest}`;
  return pipeline.ref || `#${pipeline.id}`;
}

function pipelineTitle(pipeline: Pipeline): string {
  return pipeline.name ?? `#${pipeline.id}`;
}

interface ThreadPipelinesPanelProps {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly threadId: ThreadId;
}

/** The project's latest GitLab pipelines or GitHub workflow runs. Hidden while none exist. */
export function ThreadPipelinesPanel(props: ThreadPipelinesPanelProps) {
  const threadRef = scopeThreadRef(props.environmentId, props.threadId);
  const openLink = useOpenLink(threadRef);
  const query = useEnvironmentQuery(
    pullRequestEnvironment.pipelines({
      environmentId: props.environmentId,
      input: { projectId: props.projectId },
    }),
  );
  const pipelines = query.data?.supported ? query.data.pipelines : [];
  if (pipelines.length === 0) return null;

  const open = (pipeline: Pipeline, event: MouseEvent<HTMLElement>) => {
    if (pipeline.url === null || event.button > 1) return;
    void openLink(pipeline.url, { event }).catch((error: unknown) => {
      console.error(error);
      toastManager.add({ type: "error", title: "Unable to open pipeline" });
    });
  };

  return (
    <ThreadDetailsSection headingId="thread-details-pipelines-heading" title="Pipelines">
      <ul className="m-0 list-none p-0">
        {pipelines.map((pipeline) => {
          const presentation = PIPELINE_STATUS_PRESENTATION[pipeline.status];
          return (
            <li key={pipeline.id} className="flex items-center rounded-lg">
              <ThreadDetailsControl
                size="sm"
                variant="ghost"
                part="row"
                multiline
                disabled={pipeline.url === null}
                aria-label={`Pipeline ${pipelineTitle(pipeline)} on ${pipelineRefLabel(pipeline)}: ${presentation.label}`}
                onClick={(event) => open(pipeline, event)}
                onAuxClick={(event) => open(pipeline, event)}
              >
                <PullRequestCheckStatusIcon status={presentation.check} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium leading-4 text-foreground/85">
                    {pipelineRefLabel(pipeline)}
                  </span>
                  <span className="truncate text-2xs font-normal leading-4 text-muted-foreground">
                    {pipelineTitle(pipeline)} · {presentation.label}
                    {pipeline.updatedAt ? (
                      <>
                        {" · "}
                        <RelativeTime timestamp={pipeline.updatedAt} />
                      </>
                    ) : null}
                  </span>
                </span>
              </ThreadDetailsControl>
            </li>
          );
        })}
      </ul>
    </ThreadDetailsSection>
  );
}
