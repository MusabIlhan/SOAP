import { Box, Button, Container, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconArrowDown, IconArrowRight } from "@tabler/icons-react";
import { useRef, type RefObject } from "react";

import { Logo, PainsSection, StepsSection, VisitToNotePicture } from "../components/HomeSections";
import { charted } from "../theme";

export interface HomeProps {
  /** Leaves the home page for the app's start state. */
  onEnter: () => void;
}

/**
 * The home page, in the style of the Framer "Charted" page (mocks/framer-home.png):
 * a nav bar, the headline, one large button into the app, a picture of a visit
 * becoming a note, then the clinician's three pains and how it works.
 * There is only one way in, so there is no dead button to click in the demo.
 */
export default function Home({ onEnter }: HomeProps) {
  const painsRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  // Scroll in place rather than change the address, which belongs to the app (#app).
  const scrollTo = (ref: RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <Box>
      {/* Nav */}
      <Box
        component="header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${charted.pale}`,
        }}
      >
        <Container size={1240} py={18}>
          <Group justify="space-between">
            <Group gap={12}>
              <Logo size={40} />
              <Text fz={30} fw={700} c={charted.ink} style={{ letterSpacing: "-0.04em" }}>
                Everi
              </Text>
            </Group>
            <Group gap={40}>
              <NavLink onClick={() => scrollTo(painsRef)}>The problem</NavLink>
              <NavLink onClick={() => scrollTo(stepsRef)}>How it works</NavLink>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero */}
      <Container size={1240} pt={88} pb={112}>
        <Group justify="space-between" align="center" wrap="nowrap" gap={48}>
          <Stack gap={32} maw={560}>
            <Text fz={18} fw={600} c={charted.green}>
              For prosthetists and orthotists
            </Text>
            <Title order={1} fz={64} lh={1.1} c={charted.ink} style={{ letterSpacing: "-0.035em" }}>
              Finish the note before the patient leaves.
            </Title>
            <Text fz={22} lh={1.55} c={charted.muted}>
              Everi listens to the visit, shows what Medicare needs for the device as it is said,
              and writes the SOAP note. You check it and copy it.
            </Text>
            <Group gap={36} mt={8}>
              <Button
                onClick={onEnter}
                h={76}
                pl={40}
                pr={12}
                fz={26}
                fw={600}
                rightSection={
                  <Box
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: "50%",
                      background: charted.lime,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconArrowRight size={28} color={charted.green} stroke={2.4} />
                  </Box>
                }
                styles={{ section: { marginInlineStart: 20 } }}
              >
                Start a visit
              </Button>
              <UnstyledButton onClick={() => scrollTo(stepsRef)}>
                <Group gap={8}>
                  <Text fz={20} fw={600} c={charted.green}>
                    See how it works
                  </Text>
                  <IconArrowDown size={22} color={charted.green} />
                </Group>
              </UnstyledButton>
            </Group>
          </Stack>
          <VisitToNotePicture />
        </Group>
      </Container>

      {/* The three pains */}
      <Box ref={painsRef} style={{ scrollMarginTop: 80 }}>
        <Container size={1240} py={96}>
          <PainsSection />
        </Container>
      </Box>

      {/* How it works */}
      <Box ref={stepsRef} bg={charted.mist} style={{ scrollMarginTop: 80 }}>
        <Container size={1240} py={96}>
          <StepsSection />
        </Container>
      </Box>

      <Box component="footer" bg={charted.mist} style={{ borderTop: `1px solid ${charted.pale}` }}>
        <Container size={1240} py={32}>
          <Group gap={12}>
            <Logo size={28} />
            <Text fz={17} c={charted.muted}>
              Everi: a visit becomes a SOAP note.
            </Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}

function NavLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <UnstyledButton onClick={onClick}>
      <Text fz={20} fw={500} c={charted.ink}>
        {children}
      </Text>
    </UnstyledButton>
  );
}
