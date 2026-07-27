import enum


class ManeuverStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    FINALIZADA = "FINALIZADA"


class ManeuverAction(str, enum.Enum):
    ABRIR = "ABRIR"
    FECHAR = "FECHAR"


class ManeuverStepResponsibility(str, enum.Enum):
    LOCAL = "LOCAL"
    CENTRO = "CENTRO"


class ProvisionalElementType(str, enum.Enum):
    JUMPER = "JUMPER"
    CHAVE_PROVISORIA = "CHAVE_PROVISORIA"
